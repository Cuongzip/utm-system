package com.utm.commonlibrary.model;

import com.utm.commonlibrary.model.listener.CustomAuditingEntityListener;
import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.ZonedDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@MappedSuperclass
@Getter
@Setter
@EntityListeners(CustomAuditingEntityListener.class)
public class AbstractAuditEntity {

    @CreationTimestamp
    @Column(name = "created_on", nullable = false, updatable = false)
    private ZonedDateTime createdOn;

    @Column(name = "created_by", length = 100, updatable = false)
    private String createdBy;

    @UpdateTimestamp
    @Column(name = "last_modified_on")
    private ZonedDateTime lastModifiedOn;

    @Column(name = "last_modified_by", length = 100)
    private String lastModifiedBy;
}