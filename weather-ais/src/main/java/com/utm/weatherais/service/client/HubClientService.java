package com.utm.weatherais.service.client;

import com.utm.weatherais.viewmodel.client.HubBriefVm;

import java.util.Optional;

public interface HubClientService {
    Optional<HubBriefVm> getHubById(String hubId);
}
