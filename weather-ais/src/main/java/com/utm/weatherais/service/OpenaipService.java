package com.utm.weatherais.service;

import com.utm.weatherais.viewmodel.openaip.OpenaipFeedVm;

import java.util.Optional;

public interface OpenaipService {
    OpenaipFeedVm getAirspaces(String country);

    Optional<byte[]> getTile(int z, int x, int y);
}
