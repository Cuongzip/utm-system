package com.utm.drone.controller;

import com.utm.drone.service.DroneCommandService;
import com.utm.drone.viewmodel.command.DroneCommandVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/commands")
@RequiredArgsConstructor
@Tag(name = "Flight Command History", description = "Lookup tactical commands dispatched during a specific flight")
public class FlightCommandsController {

    private final DroneCommandService droneCommandService;

    @GetMapping("/flight/{flightId}")
    @Operation(summary = "Get all commands associated with a Flight ID")
    public ResponseEntity<List<DroneCommandVm>> getCommandsByFlightId(@PathVariable String flightId) {
        return ResponseEntity.ok(droneCommandService.getCommandsByFlightId(flightId));
    }
}
