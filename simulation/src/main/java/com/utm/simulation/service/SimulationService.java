package com.utm.simulation.service;

import com.utm.simulation.viewmodel.InjectScenarioResultVm;
import com.utm.simulation.viewmodel.InjectScenarioVm;
import com.utm.simulation.viewmodel.ScenarioCatalogVm;
import com.utm.simulation.viewmodel.SimulationSessionCreateVm;
import com.utm.simulation.viewmodel.SimulationSessionVm;

import java.util.List;

public interface SimulationService {

    SimulationSessionVm createSession(SimulationSessionCreateVm createVm, String bearerToken);

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
}
