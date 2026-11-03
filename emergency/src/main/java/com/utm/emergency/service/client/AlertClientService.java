package com.utm.emergency.service.client;

public interface AlertClientService {
    record AlertPostVm(String droneId, String flightId, String alertType, String severity, String message, String status) {}
    void publishAlert(AlertPostVm alertPostVm);
}