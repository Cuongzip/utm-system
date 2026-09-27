package com.utm.user.viewmodel;

import com.utm.user.model.User;
import java.time.ZonedDateTime;

public record UserGetVm(
    Long id,
    String username,
    String email,
    String firstName,
    String lastName,
    Boolean isActive,
    ZonedDateTime createdOn,
    String createdBy,
    ZonedDateTime lastModifiedOn,
    String lastModifiedBy
) {
    public static UserGetVm fromModel(User user) {
        return new UserGetVm(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getIsActive(),
            user.getCreatedOn(),
            user.getCreatedBy(),
            user.getLastModifiedOn(),
            user.getLastModifiedBy()
        );
    }
}
