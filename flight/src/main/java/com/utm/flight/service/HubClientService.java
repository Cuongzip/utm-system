package com.utm.flight.service;

import com.utm.flight.viewmodel.HubBriefVm;

import java.util.Optional;

public interface HubClientService {
    boolean checkHubExists(String hubId);
    Optional<HubBriefVm> getHubById(String hubId);
}
