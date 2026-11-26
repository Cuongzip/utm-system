package com.utm.intelligence.service.client;

import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbAircraftClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AirspaceCheckPathClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ConflictClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DroneClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.EmergencyIncidentClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.NotamItemClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.RoutePointVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.TelemetryClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.WeatherGoNoGoClientVm;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface IntelligenceInteropClientService {

    Optional<FlightClientVm> getFlightById(String flightId);

    List<FlightClientVm> getFlights(String status, String hubId);

    Optional<HubClientVm> getHubById(String hubId);

    List<HubClientVm> getAllHubs();

    List<DroneClientVm> getAllDrones();

    Optional<TelemetryClientVm> getLatestTelemetryByFlight(String flightId);

    Optional<WeatherGoNoGoClientVm> getWeatherGoNoGo(String hubId);

    List<AdsbAircraftClientVm> getAdsbAircraft();

    List<NotamItemClientVm> getNotams();

    Optional<AirspaceCheckPathClientVm> checkAirspacePath(List<RoutePointVm> points);

    List<ConflictClientVm> getActiveConflicts();

    List<EmergencyIncidentClientVm> getEmergencyIncidents(boolean activeOnly);

    Map<String, Object> getFleetOverview();
}
