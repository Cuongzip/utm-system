package com.utm.emergency.service.client;

import com.utm.emergency.viewmodel.client.AlertPostVm;

public interface AlertClientService {
    void publishAlert(AlertPostVm alertPostVm);
}