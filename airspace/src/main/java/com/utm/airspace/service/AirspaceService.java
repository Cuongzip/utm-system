package com.utm.airspace.service;

import com.utm.airspace.viewmodel.check.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.check.AirspaceCheckVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneListVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.zone.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.zone.AirspaceZoneVm;

public interface AirspaceService {

    AirspaceCheckResultVm checkPoint(AirspaceCheckVm checkVm);

    AirspaceCheckPathResultVm checkPath(AirspaceCheckPathVm checkPathVm);

    AirspaceZoneListVm getAllZones(String hubId, String zoneType, String status, int limit, int offset);

    AirspaceZoneVm getZoneById(String id);

    AirspaceZoneVm createZone(AirspaceZonePostVm postVm);

    AirspaceZoneVm updateZone(String id, AirspaceZonePutVm putVm);

    void deleteZone(String id);
}

