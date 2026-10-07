package com.utm.alert.service;

import com.utm.alert.viewmodel.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.AlertListVm;
import com.utm.alert.viewmodel.AlertPostVm;
import com.utm.alert.viewmodel.AlertResolvePostVm;
import com.utm.alert.viewmodel.AlertVm;

import java.util.List;

public interface AlertService {

    AlertVm createAlert(AlertPostVm postVm);

    AlertVm getAlertById(String id);

    AlertListVm getAlerts(
            String droneId,
            String flightId,
            String severity,
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
}
