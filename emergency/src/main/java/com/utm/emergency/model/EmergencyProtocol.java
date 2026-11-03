package com.utm.emergency.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;
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
@Table(name = "emergency_protocols")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyProtocol extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", length = 100, nullable = false, unique = true)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "emergency_type", length = 50, nullable = false)
    private EmergencyType emergencyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 50, nullable = false)
    private EmergencySeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_action", length = 50, nullable = false)
    private ResponseAction responseAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "fallback_action", length = 50)
    private ResponseAction fallbackAction;

    @Column(name = "requires_confirmation", nullable = false)
    @Builder.Default
    private boolean requiresConfirmation = true;

    @Column(name = "confirmation_timeout_seconds", nullable = false)
    @Builder.Default
    private int confirmationTimeoutSeconds = 30;

    @Column(name = "auto_execute_on_timeout", nullable = false)
    @Builder.Default
    private boolean autoExecuteOnTimeout = true;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private int priority = 50;

    @Column(name = "thresholds", columnDefinition = "TEXT")
    private String thresholds;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "notify_pilot", nullable = false)
    @Builder.Default
    private boolean notifyPilot = true;

    @Column(name = "notify_supervisor", nullable = false)
    @Builder.Default
    private boolean notifySupervisor = true;

    @Column(name = "notify_ops_center", nullable = false)
    @Builder.Default
    private boolean notifyOpsCenter = true;

    @Column(name = "send_sms", nullable = false)
    @Builder.Default
    private boolean sendSms = false;

    @Column(name = "send_email", nullable = false)
    @Builder.Default
    private boolean sendEmail = true;

    @Column(name = "play_audio_alarm", nullable = false)
    @Builder.Default
    private boolean playAudioAlarm = true;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "is_system_default", nullable = false)
    @Builder.Default
    private boolean isSystemDefault = false;
}