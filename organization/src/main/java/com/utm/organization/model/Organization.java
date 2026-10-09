package com.utm.organization.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "organization")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Organization extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50, nullable = false)
    private OrganizationType type;

    @Column(name = "registration_number", length = 100, nullable = false, unique = true)
    private String registrationNumber;

    @Column(name = "contact_info", columnDefinition = "TEXT")
    private String contactInfo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private OrganizationStatus status = OrganizationStatus.ACTIVE;
}
