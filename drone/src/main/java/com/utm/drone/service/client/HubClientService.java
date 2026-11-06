package com.utm.drone.service.client;

import com.utm.drone.viewmodel.client.HubBriefVm;

import java.util.Optional;

public interface HubClientService {

    boolean checkHubExists(String hubId);

    Optional<HubBriefVm> getHubById(String hubId);
}
