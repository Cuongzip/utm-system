package com.utm.connectivity.service;

import com.utm.connectivity.viewmodel.integration.IntegrationDroneRegisteredVm;
import com.utm.connectivity.viewmodel.integration.IntegrationRegisterDronePostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationStatusVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryPostVm;
import com.utm.connectivity.viewmodel.integration.IntegrationTelemetryResultVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyCreatedVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyPostVm;
import com.utm.connectivity.viewmodel.integration.ManufacturerApiKeyVm;

import java.util.List;

public interface IntegrationService {

    ManufacturerApiKeyCreatedVm createApiKey(ManufacturerApiKeyPostVm postVm);

    List<ManufacturerApiKeyVm> listApiKeys();

    ManufacturerApiKeyVm revokeApiKey(String id);

    IntegrationTelemetryResultVm ingestManufacturerTelemetry(String rawApiKey, IntegrationTelemetryPostVm postVm);

    IntegrationDroneRegisteredVm registerManufacturerDrone(String rawApiKey, IntegrationRegisterDronePostVm postVm);

    IntegrationStatusVm getManufacturerStatus(String rawApiKey);
}
