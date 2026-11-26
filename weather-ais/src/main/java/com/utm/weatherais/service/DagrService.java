package com.utm.weatherais.service;

import com.utm.weatherais.viewmodel.dagr.DagrConfigVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrCheckPointsResponseVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrPointVm;

import java.util.List;
import java.util.Map;

public interface DagrService {
    DagrConfigVm getConfig();

    Map<String, Object> getFeatureInfo(Map<String, String> queryParams);

    DagrCheckPointsResponseVm checkPoints(List<DagrPointVm> points);
}
