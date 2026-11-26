package com.utm.connectivity.viewmodel.integration;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Response returned once when a new manufacturer API key is generated")
public record ManufacturerApiKeyCreatedVm(
        @Schema(description = "Plaintext API key (shown only once upon creation)")
        String apiKey,

        @Schema(description = "Persisted API key metadata")
        ManufacturerApiKeyVm keyInfo
) {
}
