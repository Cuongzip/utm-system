package com.utm.weatherais.service;

import com.utm.weatherais.viewmodel.weather.CurrentWeatherVm;
import com.utm.weatherais.viewmodel.weather.MetarReportVm;
import com.utm.weatherais.viewmodel.weather.SigmetReportVm;
import com.utm.weatherais.viewmodel.weather.TafReportVm;
import com.utm.weatherais.viewmodel.weather.WeatherAlertVm;
import com.utm.weatherais.viewmodel.weather.WeatherForecastVm;
import com.utm.weatherais.viewmodel.weather.WeatherGoNoGoVm;

import java.util.List;

public interface WeatherService {
    List<MetarReportVm> getMetar(String ids);

    List<TafReportVm> getTaf(String ids);

    List<SigmetReportVm> getSigmet(String fir);

    CurrentWeatherVm getCurrentWeather(String hubId);

    WeatherForecastVm getForecast(String hubId);

    List<WeatherAlertVm> getAlerts(String hubId);

    WeatherGoNoGoVm getGoNoGo(String hubId);
}
