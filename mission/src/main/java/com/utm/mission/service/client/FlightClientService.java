package com.utm.mission.service.client;

import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;

import java.util.Optional;

public interface FlightClientService {

    Optional<FlightBriefVm> createFlight(FlightCreateRequestVm requestVm);
}
