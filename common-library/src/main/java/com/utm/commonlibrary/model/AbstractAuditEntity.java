package com.utm.commonlibrary.model;

import com.utm.commonlibrary.model.listener.CustomAuditingEntityListener;
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
    private ZonedDateTime createdOn;

    private String createdBy;

    @UpdateTimestamp
    private ZonedDateTime lastModifiedOn;

    private String lastModifiedBy;
}