package com.utm.emergency.service.client;

import java.util.List;
import java.util.Optional;

public interface HubClientService {
    record HubLocationVm(String id, String code, String name, Double latitude, Double longitude, String status) {}
    Optional<HubLocationVm> getHubById(String hubId);
    List<HubLocationVm> getActiveHubs();
}