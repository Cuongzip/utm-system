package com.utm.mission.model;

import com.utm.commonlibrary.model.AbstractAuditEntity;
import com.utm.mission.viewmodel.template.MissionBlueprintVm;
import com.utm.mission.viewmodel.template.TemplateVariableVm;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.List;

@Entity
@Table(name = "mission_template")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MissionTemplate extends AbstractAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "code", length = 50, nullable = false)
    private String code;

    @Column(name = "name", length = 255, nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "category", length = 60)
    private String category;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb")
    private List<String> tags;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables", columnDefinition = "jsonb")
    private List<TemplateVariableVm> variables;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "blueprint", columnDefinition = "jsonb", nullable = false)
    private MissionBlueprintVm blueprint;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "is_latest", nullable = false)
    @Builder.Default
    private Boolean isLatest = true;

    @Column(name = "previous_version_id", length = 36)
    private String previousVersionId;

    @Column(name = "changelog", columnDefinition = "TEXT")
    private String changelog;

    @Column(name = "usage_count", nullable = false)
    @Builder.Default
    private Integer usageCount = 0;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = false;

    @Column(name = "published_at")
    private ZonedDateTime publishedAt;
}
