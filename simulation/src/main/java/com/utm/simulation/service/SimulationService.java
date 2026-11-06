package com.utm.simulation.service;

import com.utm.simulation.model.enumeration.SimulationStatus;
import com.utm.simulation.viewmodel.scenario.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.scenario.InjectScenarioVm;
import com.utm.simulation.viewmodel.scenario.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.session.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.session.SimulationSessionListVm;
import com.utm.simulation.viewmodel.session.SimulationSessionVm;

import java.util.List;

public interface SimulationService {

    SimulationSessionVm createSession(SimulationSessionCreateVm createVm);

    SimulationSessionListVm getSessions(SimulationStatus status, String droneId, String flightId, String search, int limit, int offset);

    List<SimulationSessionVm> getAllSessions();

    List<SimulationSessionVm> getActiveSessions();

    SimulationSessionVm getSessionById(String id);

    void deleteSession(String id);

    SimulationSessionVm pauseSession(String id);

    SimulationSessionVm resumeSession(String id);

    SimulationSessionVm updateTimeScale(String id, Double timeScale);

    InjectScenarioResultVm injectScenario(String id, InjectScenarioVm injectVm);

    SimulationSessionVm stopSession(String id);

    List<ScenarioCatalogVm> getScenarioCatalog();

    List<com.utm.simulation.viewmodel.session.SimulationEventVm> getSessionEvents(String id);
}

