package com.utm.emergency.service;

import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.viewmodel.config.ConfigValueVm;
import com.utm.emergency.viewmodel.config.EmergencyConfigVm;
import com.utm.emergency.viewmodel.config.EmergencySystemConfigVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;

public interface EmergencyConfigService {
    EmergencySystemConfigVm getSystemConfig();
    OperationModeVm setMode(OperationMode mode);
    EmergencyConfigVm setConfig(String key, ConfigValueVm vm);
}