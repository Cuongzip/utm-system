package com.utm.flight.service;

import com.utm.flight.viewmodel.FeasibilityCheckPostVm;
import com.utm.flight.viewmodel.FeasibilityEvaluationListVm;
import com.utm.flight.viewmodel.FeasibilityOverridePostVm;
import com.utm.flight.viewmodel.FeasibilityResultVm;
import com.utm.flight.viewmodel.FlightVm;

public interface FeasibilityService {

    FeasibilityResultVm checkFeasibility(String flightId, FeasibilityCheckPostVm request);

    FlightVm overrideFeasibility(String flightId, FeasibilityOverridePostVm request);

    FeasibilityEvaluationListVm getHistory(String flightId, String droneId, int limit, int offset);
}
