package com.utm.drone.service;

import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import com.utm.drone.viewmodel.command.DroneCommandListVm;
import com.utm.drone.viewmodel.command.DroneCommandPostVm;
import com.utm.drone.viewmodel.command.DroneCommandVm;

import java.util.List;

public interface DroneCommandService {

    DroneCommandVm sendCommand(String droneId, DroneCommandPostVm postVm);

    DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType, int limit, int offset);

    default DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType,
            String flightId, int limit, int offset) {
        return getCommands(droneId, status, commandType, limit, offset);
    }

    List<DroneCommandVm> getCommandsByFlightId(String flightId);

    DroneCommandVm getCommandById(String droneId, String commandId);

    DroneCommandVm cancelCommand(String droneId, String commandId);

    List<DroneCommandVm> getActiveCommands(String droneId);
}
