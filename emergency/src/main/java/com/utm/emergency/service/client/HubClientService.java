package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.HubLocationVm;

import java.util.List;
import java.util.Optional;

public interface HubClientService {
    Optional<HubLocationVm> getHubById(String hubId);
    List<HubLocationVm> getActiveHubs();
}