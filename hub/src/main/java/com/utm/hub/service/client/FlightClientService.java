package com.utm.hub.service.client;

public interface FlightClientService {

    boolean hasActiveFlightsAtHub(String hubId);

    default int countActiveFlightsAtHub(String hubId) {
        return hasActiveFlightsAtHub(hubId) ? 1 : 0;
    }
}
