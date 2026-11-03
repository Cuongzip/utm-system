package com.utm.emergency.service;

import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;

import java.time.ZonedDateTime;
import java.util.List;

public interface BlackboxService {
    BlackboxEntryVm recordEntry(BlackboxEntryPostVm postVm);
    List<BlackboxEntryVm> getIncidentBlackbox(String incidentId, ZonedDateTime from, ZonedDateTime to);
    List<BlackboxEntryVm> getFlightBlackbox(String flightId, ZonedDateTime from, ZonedDateTime to, int limit);
}