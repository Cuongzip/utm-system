package com.utm.alert.service;

import com.utm.alert.viewmodel.alert.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.alert.AlertListVm;
import com.utm.alert.viewmodel.alert.AlertPostVm;
import com.utm.alert.viewmodel.alert.AlertResolvePostVm;
import com.utm.alert.viewmodel.alert.AlertVm;

import java.util.List;

public interface AlertService {

    AlertVm createAlert(AlertPostVm postVm);

    AlertVm getAlertById(String id);

    AlertListVm getAlerts(
            String droneId,
            String flightId,
            String severity,
            String status,
            Boolean acknowledged,
            Boolean resolved,
            String alertType,
            int pageNo,
            int pageSize
    );

    List<AlertVm> getActiveAlerts();

    List<AlertVm> getAlertsByFlight(String flightId);

    AlertVm acknowledgeAlert(String id, AlertAcknowledgePostVm acknowledgeVm);

    AlertVm resolveAlert(String id, AlertResolvePostVm resolveVm);

    int resolveByConflictId(String conflictId, String resolutionNotes);

    int resolveByIncidentId(String incidentId, String resolutionNotes);
}

