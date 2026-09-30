package com.utm.commonlibrary.model;

import com.utm.commonlibrary.model.listener.CustomAuditingEntityListener;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import java.time.ZonedDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;

@MappedSuperclass
@Getter
@Setter
@EntityListeners(CustomAuditingEntityListener.class)
public class AbstractAuditEntity {

    @CreatedDate
    @CreationTimestamp
    private ZonedDateTime createdOn;

    @CreatedBy
    private String createdBy;

    @LastModifiedDate
    @UpdateTimestamp
    private ZonedDateTime lastModifiedOn;

    @LastModifiedBy
    private String lastModifiedBy;
}