package com.utm.flight.service;

import com.utm.flight.viewmodel.HubVm;

import java.util.Optional;

public interface HubClientService {
    boolean checkHubExists(String hubId);
    Optional<HubVm> getHubById(String hubId);
}
