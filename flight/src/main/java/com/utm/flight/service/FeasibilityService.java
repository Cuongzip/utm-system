package com.utm.flight.service;

import com.utm.flight.viewmodel.feasibility.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.feasibility.FeasibilityResultVm;
import com.utm.flight.viewmodel.flight.FlightVm;

public interface FeasibilityService {

    FeasibilityResultVm checkFeasibility(String flightId, FeasibilityCheckPostVm request);

    FlightVm overrideFeasibility(String flightId, FeasibilityOverridePostVm request);

    FeasibilityEvaluationListVm getHistory(String flightId, String droneId, int limit, int offset);
}

