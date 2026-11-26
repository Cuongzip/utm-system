package com.utm.connectivity.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.connectivity.model.DeviceCertificate;
import com.utm.connectivity.model.DeviceRegistration;
import com.utm.connectivity.model.enumeration.DeviceRegistrationStatus;
import com.utm.connectivity.repository.DeviceCertificateRepository;
import com.utm.connectivity.repository.DeviceRegistrationRepository;
import com.utm.connectivity.viewmodel.certificate.CaCertificateVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateBundleVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateVm;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.BasicConstraints;
import org.bouncycastle.asn1.x509.Extension;
import org.bouncycastle.asn1.x509.KeyUsage;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificateServiceImpl implements CertificateService {

    private static final String CA_COMMON_NAME = "UTM Root CA";
    private static final int DEVICE_CERT_VALIDITY_DAYS = 90;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final DeviceRegistrationService deviceRegistrationService;
    private final DeviceRegistrationRepository deviceRegistrationRepository;
    private final DeviceCertificateRepository certificateRepository;

    private volatile KeyPair caKeyPair;
    private volatile X509Certificate caCertificate;
    private volatile String caCertificatePem;
    private volatile ZonedDateTime caExpiresAt;

    @PostConstruct
    public synchronized void initializeRootCa() {
        if (caCertificatePem != null) {
            return;
        }
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048, SECURE_RANDOM);
            caKeyPair = keyGen.generateKeyPair();

            ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
            caExpiresAt = now.plusYears(10);
            X500Name caSubject = new X500Name("CN=" + CA_COMMON_NAME + ", O=UTM System, C=VN");
            BigInteger serial = new BigInteger(128, SECURE_RANDOM).abs();

            JcaX509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                    caSubject,
                    serial,
                    Date.from(now.minusMinutes(5).toInstant()),
                    Date.from(caExpiresAt.toInstant()),
                    caSubject,
                    caKeyPair.getPublic()
            );
            certBuilder.addExtension(Extension.basicConstraints, true, new BasicConstraints(true));
            certBuilder.addExtension(Extension.keyUsage, true, new KeyUsage(KeyUsage.keyCertSign | KeyUsage.cRLSign));

            ContentSigner signer = new JcaContentSignerBuilder("SHA256WithRSA").build(caKeyPair.getPrivate());
            caCertificate = new JcaX509CertificateConverter().getCertificate(certBuilder.build(signer));
            caCertificatePem = toPem(caCertificate);
            log.info("Initialized RSA-2048 UTM Root CA certificate (valid until {})", caExpiresAt);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to initialize UTM Root CA", ex);
        }
    }

    @Override
    public CaCertificateVm getCaCertificate() {
        ensureCaInitialized();
        return new CaCertificateVm(caCertificatePem, CA_COMMON_NAME, caExpiresAt);
    }

    @Override
    @Transactional
    public DeviceCertificateBundleVm issueDeviceCertificate(String deviceIdOrKey) {
        ensureCaInitialized();
        DeviceRegistration device = deviceRegistrationService.requireEntityByKey(deviceIdOrKey);

        List<DeviceCertificate> existingActive = certificateRepository
                .findByDeviceRegistrationIdAndRevokedAtIsNull(device.getId());
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        for (DeviceCertificate oldCert : existingActive) {
            oldCert.setRevokedAt(now);
            oldCert.setRevocationReason("Superseded by certificate rotation");
        }
        if (!existingActive.isEmpty()) {
            certificateRepository.saveAll(existingActive);
        }

        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048, SECURE_RANDOM);
            KeyPair deviceKeys = keyGen.generateKeyPair();

            ZonedDateTime expiresAt = now.plusDays(DEVICE_CERT_VALIDITY_DAYS);
            String commonName = device.getDeviceIdentifier();
            BigInteger serial = new BigInteger(128, SECURE_RANDOM).abs();
            String serialHex = serial.toString(16).toUpperCase();

            X500Name issuer = new X500Name(caCertificate.getSubjectX500Principal().getName());
            X500Name subject = new X500Name("CN=" + commonName + ", OU=" + device.getDeviceType().name() + ", O=UTM System");

            JcaX509v3CertificateBuilder builder = new JcaX509v3CertificateBuilder(
                    issuer,
                    serial,
                    Date.from(now.minusMinutes(1).toInstant()),
                    Date.from(expiresAt.toInstant()),
                    subject,
                    deviceKeys.getPublic()
            );
            builder.addExtension(Extension.basicConstraints, false, new BasicConstraints(false));
            builder.addExtension(Extension.keyUsage, true,
                    new KeyUsage(KeyUsage.digitalSignature | KeyUsage.keyEncipherment));

            ContentSigner signer = new JcaContentSignerBuilder("SHA256WithRSA").build(caKeyPair.getPrivate());
            X509Certificate x509 = new JcaX509CertificateConverter().getCertificate(builder.build(signer));

            String certPem = toPem(x509);
            String privateKeyPem = toPem(deviceKeys.getPrivate());
            String fingerprint = sha256Hex(x509.getEncoded());

            DeviceCertificate entity = new DeviceCertificate();
            entity.setDeviceRegistrationId(device.getId());
            entity.setCertificatePem(certPem);
            entity.setFingerprint(fingerprint);
            entity.setCommonName(commonName);
            entity.setSerialNumber(serialHex);
            entity.setIssuedAt(now);
            entity.setExpiresAt(expiresAt);
            certificateRepository.saveAndFlush(entity);

            device.setCertificateFingerprint(fingerprint);
            device.setRegistrationStatus(DeviceRegistrationStatus.ACTIVE);
            deviceRegistrationRepository.save(device);

            return new DeviceCertificateBundleVm(
                    certPem,
                    privateKeyPem,
                    caCertificatePem,
                    fingerprint,
                    commonName,
                    serialHex,
                    now,
                    expiresAt
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign X.509 device certificate", ex);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public DeviceCertificateVm getDeviceCertificate(String deviceIdOrKey) {
        ensureCaInitialized();
        DeviceRegistration device = deviceRegistrationService.requireEntityByKey(deviceIdOrKey);
        DeviceCertificate cert = certificateRepository
                .findFirstByDeviceRegistrationIdAndRevokedAtIsNullOrderByIssuedAtDesc(device.getId())
                .orElseThrow(() -> new NotFoundException(MessageCode.CERTIFICATE_NOT_FOUND, "deviceId", device.getId()));
        return toVm(cert, device.getDeviceIdentifier());
    }

    @Override
    @Transactional
    public DeviceCertificateVm revokeDeviceCertificate(String deviceIdOrKey, String reason) {
        ensureCaInitialized();
        DeviceRegistration device = deviceRegistrationService.requireEntityByKey(deviceIdOrKey);
        DeviceCertificate cert = certificateRepository
                .findFirstByDeviceRegistrationIdAndRevokedAtIsNullOrderByIssuedAtDesc(device.getId())
                .orElseThrow(() -> new NotFoundException(MessageCode.CERTIFICATE_NOT_FOUND, "deviceId", device.getId()));

        cert.setRevokedAt(ZonedDateTime.now(ZoneOffset.UTC));
        cert.setRevocationReason((reason != null && !reason.isBlank()) ? reason.trim() : "Revoked by administrator");
        DeviceCertificate saved = certificateRepository.saveAndFlush(cert);

        device.setCertificateFingerprint(null);
        deviceRegistrationRepository.save(device);
        return toVm(saved, device.getDeviceIdentifier());
    }

    private void ensureCaInitialized() {
        if (caCertificatePem == null) {
            initializeRootCa();
        }
    }

    private DeviceCertificateVm toVm(DeviceCertificate cert, String deviceIdentifier) {
        return new DeviceCertificateVm(
                cert.getId(),
                cert.getDeviceRegistrationId(),
                deviceIdentifier,
                cert.getCertificatePem(),
                caCertificatePem,
                cert.getFingerprint(),
                cert.getCommonName(),
                cert.getSerialNumber(),
                cert.getIssuedAt(),
                cert.getExpiresAt(),
                cert.getRevokedAt(),
                cert.getRevocationReason()
        );
    }

    private static String toPem(Object obj) throws Exception {
        StringWriter sw = new StringWriter();
        try (JcaPEMWriter writer = new JcaPEMWriter(sw)) {
            writer.writeObject(obj);
        }
        return sw.toString();
    }

    private static String sha256Hex(byte[] bytes) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().withUpperCase().formatHex(md.digest(bytes));
    }
}
