package com.utm.connectivity.service;

import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.connectivity.viewmodel.stats.CommandStatsVm;
import com.utm.connectivity.viewmodel.stats.ConnectivityStatusVm;
import com.utm.connectivity.viewmodel.stats.ProtocolStatsVm;

public interface CommandRouterService {

    void routeCommand(DroneCommandEvent commandEvent);

    CommandStatsVm getCommandStats();

    ProtocolStatsVm getProtocolStats();

    ConnectivityStatusVm getConnectivityStatus();
}
