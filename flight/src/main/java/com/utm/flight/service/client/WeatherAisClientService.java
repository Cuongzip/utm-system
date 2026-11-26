package com.utm.flight.service.client;

import com.utm.flight.viewmodel.client.WeatherGoNoGoClientVm;

import java.util.Optional;

public interface WeatherAisClientService {
    Optional<WeatherGoNoGoClientVm> getWeatherGoNoGo(String hubId);
}
