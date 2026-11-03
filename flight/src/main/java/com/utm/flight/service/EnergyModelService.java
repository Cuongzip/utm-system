package com.utm.flight.service;

import com.utm.flight.viewmodel.feasibility.DroneEnergySpecVm;
import com.utm.flight.viewmodel.feasibility.EnergyCalculationResultVm;
import com.utm.flight.viewmodel.feasibility.EnvConditionsVm;
import com.utm.flight.viewmodel.feasibility.MissionProfileVm;

public interface EnergyModelService {
    EnergyCalculationResultVm calculateEnergy(
            DroneEnergySpecVm droneSpec,
            MissionProfileVm missionProfile,
            EnvConditionsVm envConditions
    );
}

