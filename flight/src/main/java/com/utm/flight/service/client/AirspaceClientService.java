package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.AirspacePathCheckResultVm;

import java.util.List;

public interface AirspaceClientService {

    AirspacePathCheckResultVm checkPath(List<List<Double>> routeCoordinates, Double defaultAltitude);
}
