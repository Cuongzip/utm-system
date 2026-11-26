package com.utm.airspace.service.client;

import com.utm.airspace.viewmodel.client.OpenaipFeedClientVm.OpenaipAirspaceItemVm;

import java.util.List;

public interface WeatherAisClientService {
    List<OpenaipAirspaceItemVm> getOpenaipAirspaces();
}
