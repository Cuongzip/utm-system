package com.utm.emergency.service;

import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;

import java.util.List;

public interface EmergencyProtocolService {
    List<EmergencyProtocolVm> getProtocols(Boolean active);
    EmergencyProtocolVm getProtocolById(String id);
    EmergencyProtocolVm createProtocol(EmergencyProtocolPostVm postVm);
    EmergencyProtocolVm updateProtocol(String id, EmergencyProtocolPutVm putVm);
}