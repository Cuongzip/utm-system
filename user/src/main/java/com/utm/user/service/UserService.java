package com.utm.user.service;

import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.user.model.User;
import com.utm.user.repository.UserRepository;
import com.utm.user.viewmodel.UserGetVm;
import com.utm.user.viewmodel.UserPostVm;
import com.utm.user.viewmodel.UserPutVm;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserGetVm> getAllUsers() {
        return userRepository.findAll().stream()
            .map(UserGetVm::fromModel)
            .toList();
    }

    @Transactional(readOnly = true)
    public UserGetVm getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", id));
        return UserGetVm.fromModel(user);
    }

    public UserGetVm createUser(UserPostVm postVm) {
        if (userRepository.existsByUsername(postVm.username())) {
            throw new DuplicatedException("NAME_ALREADY_EXITED", postVm.username());
        }
        if (userRepository.existsByEmail(postVm.email())) {
            throw new DuplicatedException("RESOURCE_ALREADY_EXISTED", postVm.email());
        }

        User user = User.builder()
            .username(postVm.username())
            .email(postVm.email())
            .firstName(postVm.firstName())
            .lastName(postVm.lastName())
            .password(postVm.password())
            .isActive(true)
            .build();

        User savedUser = userRepository.save(user);
        return UserGetVm.fromModel(savedUser);
    }

    public UserGetVm updateUser(Long id, UserPutVm putVm) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("USER_NOT_FOUND", id));

        if (putVm.email() != null && userRepository.existsByEmailAndIdNot(putVm.email(), id)) {
            throw new DuplicatedException("RESOURCE_ALREADY_EXISTED", putVm.email());
        }

        if (putVm.email() != null) {
            user.setEmail(putVm.email());
        }
        if (putVm.firstName() != null) {
            user.setFirstName(putVm.firstName());
        }
        if (putVm.lastName() != null) {
            user.setLastName(putVm.lastName());
        }
        if (putVm.password() != null) {
            user.setPassword(putVm.password());
        }
        if (putVm.isActive() != null) {
            user.setIsActive(putVm.isActive());
        }

        User updatedUser = userRepository.save(user);
        return UserGetVm.fromModel(updatedUser);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("USER_NOT_FOUND", id);
        }
        userRepository.deleteById(id);
    }
}
