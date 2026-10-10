package com.utm.airspace.service;

import com.utm.airspace.viewmodel.AirspaceCheckPathResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckPathVm;
import com.utm.airspace.viewmodel.AirspaceCheckResultVm;
import com.utm.airspace.viewmodel.AirspaceCheckVm;
import com.utm.airspace.viewmodel.AirspaceZonePostVm;
import com.utm.airspace.viewmodel.AirspaceZonePutVm;
import com.utm.airspace.viewmodel.AirspaceZoneVm;

import java.util.List;

public interface AirspaceService {

    AirspaceCheckResultVm checkPoint(AirspaceCheckVm checkVm);

    AirspaceCheckPathResultVm checkPath(AirspaceCheckPathVm checkPathVm);

    List<AirspaceZoneVm> getAllZones(String hubId, String zoneType, String status);

    AirspaceZoneVm getZoneById(String id);

    AirspaceZoneVm createZone(AirspaceZonePostVm postVm);

    AirspaceZoneVm updateZone(String id, AirspaceZonePutVm putVm);

    void deleteZone(String id);
}
