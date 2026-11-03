package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.HubBriefVm;

import java.util.Optional;

public interface HubClientService {
    boolean checkHubExists(String hubId);
    Optional<HubBriefVm> getHubById(String hubId);
}


