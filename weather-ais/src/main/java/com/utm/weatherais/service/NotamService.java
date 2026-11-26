package com.utm.weatherais.service;

import com.utm.weatherais.viewmodel.notam.NotamFeedVm;

public interface NotamService {
    NotamFeedVm getNotams(String icaos);
}
