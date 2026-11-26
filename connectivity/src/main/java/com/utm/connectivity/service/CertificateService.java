package com.utm.connectivity.service;

import com.utm.connectivity.viewmodel.certificate.CaCertificateVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateBundleVm;
import com.utm.connectivity.viewmodel.certificate.DeviceCertificateVm;

public interface CertificateService {

    CaCertificateVm getCaCertificate();

    DeviceCertificateBundleVm issueDeviceCertificate(String deviceIdOrKey);

    DeviceCertificateVm getDeviceCertificate(String deviceIdOrKey);

    DeviceCertificateVm revokeDeviceCertificate(String deviceIdOrKey, String reason);
}
