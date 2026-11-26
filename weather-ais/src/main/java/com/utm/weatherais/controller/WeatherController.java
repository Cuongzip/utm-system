package com.utm.weatherais.controller;

import com.utm.weatherais.service.WeatherService;
import com.utm.weatherais.viewmodel.weather.CurrentWeatherVm;
import com.utm.weatherais.viewmodel.weather.MetarReportVm;
import com.utm.weatherais.viewmodel.weather.SigmetReportVm;
import com.utm.weatherais.viewmodel.weather.TafReportVm;
import com.utm.weatherais.viewmodel.weather.WeatherAlertVm;
import com.utm.weatherais.viewmodel.weather.WeatherForecastVm;
import com.utm.weatherais.viewmodel.weather.WeatherGoNoGoVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/weather")
@RequiredArgsConstructor
@Tag(name = "Weather", description = "Aviation METAR, TAF, SIGMET, Hub Open-Meteo telemetry, and Go/No-Go evaluation")
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/metar")
    @Operation(summary = "Get live METAR observations for aerodromes (NOAA AWC)")
    public ResponseEntity<List<MetarReportVm>> getMetar(@RequestParam(required = false) String ids) {
        return ResponseEntity.ok(weatherService.getMetar(ids));
    }

    @GetMapping("/taf")
    @Operation(summary = "Get live TAF forecasts for aerodromes (NOAA AWC)")
    public ResponseEntity<List<TafReportVm>> getTaf(@RequestParam(required = false) String ids) {
        return ResponseEntity.ok(weatherService.getTaf(ids));
    }

    @GetMapping("/sigmet")
    @Operation(summary = "Get active SIGMET hazardous weather advisories for FIRs (NOAA AWC)")
    public ResponseEntity<List<SigmetReportVm>> getSigmet(@RequestParam(required = false) String fir) {
        return ResponseEntity.ok(weatherService.getSigmet(fir));
    }

    @GetMapping("/current/{hubId}")
    @Operation(summary = "Get real-time meteorological conditions at a Vertiport Hub")
    public ResponseEntity<CurrentWeatherVm> getCurrentWeather(@PathVariable String hubId) {
        return ResponseEntity.ok(weatherService.getCurrentWeather(hubId));
    }

    @GetMapping("/forecast/{hubId}")
    @Operation(summary = "Get 48-hour hourly weather forecast at a Vertiport Hub")
    public ResponseEntity<WeatherForecastVm> getForecast(@PathVariable String hubId) {
        return ResponseEntity.ok(weatherService.getForecast(hubId));
    }

    @GetMapping("/alerts/{hubId}")
    @Operation(summary = "Get active meteorological hazard alerts for a Vertiport Hub")
    public ResponseEntity<List<WeatherAlertVm>> getAlerts(@PathVariable String hubId) {
        return ResponseEntity.ok(weatherService.getAlerts(hubId));
    }

    @GetMapping("/go-no-go/{hubId}")
    @Operation(summary = "Evaluate fused METAR + SIGMET + Open-Meteo GO / CAUTION / NO_GO decision for a Hub")
    public ResponseEntity<WeatherGoNoGoVm> getGoNoGo(@PathVariable String hubId) {
        return ResponseEntity.ok(weatherService.getGoNoGo(hubId));
    }
}
