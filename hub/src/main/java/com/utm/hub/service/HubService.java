package com.utm.hub.service;

import com.utm.hub.model.enumeration.HubStatus;
import com.utm.hub.viewmodel.HubPostVm;
import com.utm.hub.viewmodel.HubPutVm;
import com.utm.hub.viewmodel.HubVm;

import java.util.List;

public interface HubService {

    List<HubVm> getHubs(String search, HubStatus status);

    HubVm getHubById(String id);

    HubVm createHub(HubPostVm hubPostVm);

    HubVm updateHub(String id, HubPutVm hubPutVm);

    void deactivateHub(String id);
}
