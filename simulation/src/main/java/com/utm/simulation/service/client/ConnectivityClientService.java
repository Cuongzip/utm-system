package com.utm.simulation.service.client;

public interface ConnectivityClientService {

    boolean sendHeartbeat(String deviceId);

    default boolean disconnectDevice(String deviceId) {
        return true;
    }
}


