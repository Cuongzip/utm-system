package com.utm.flight.service;

import com.utm.flight.viewmodel.DroneEnergySpecVm;
import com.utm.flight.viewmodel.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.EnvConditionsVm;
import com.utm.flight.viewmodel.MissionProfileVm;

public interface EnergyModelService {
    EnergyCalculationResultVm calculateEnergy(
            DroneEnergySpecVm droneSpec,
            MissionProfileVm missionProfile,
            EnvConditionsVm envConditions
    );
}
