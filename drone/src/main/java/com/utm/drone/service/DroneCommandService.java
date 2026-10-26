package com.utm.drone.service;

import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import com.utm.drone.viewmodel.DroneCommandListVm;
import com.utm.drone.viewmodel.DroneCommandPostVm;
import com.utm.drone.viewmodel.DroneCommandVm;

import java.util.List;

public interface DroneCommandService {

    DroneCommandVm sendCommand(String droneId, DroneCommandPostVm postVm);

    DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType, int limit, int offset);

    DroneCommandVm getCommandById(String droneId, String commandId);

    DroneCommandVm cancelCommand(String droneId, String commandId);

    List<DroneCommandVm> getActiveCommands(String droneId);
}
