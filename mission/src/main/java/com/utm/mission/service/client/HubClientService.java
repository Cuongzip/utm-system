package com.utm.mission.service.client;

import com.utm.mission.viewmodel.client.HubBriefVm;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

public interface HubClientService {

    boolean checkHubExists(String hubId);

    Optional<HubBriefVm> getHubById(String hubId);

    Map<String, HubBriefVm> getHubsByIds(Collection<String> hubIds);
}
