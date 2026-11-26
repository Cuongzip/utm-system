package com.utm.connectivity.service.client;

import com.utm.connectivity.viewmodel.client.HubBriefVm;

import java.util.Optional;

public interface HubClientService {
    Optional<HubBriefVm> getHubById(String hubId);
}
