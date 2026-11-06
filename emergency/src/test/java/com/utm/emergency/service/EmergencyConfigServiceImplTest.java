package com.utm.emergency.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.mapper.EmergencyConfigMapper;
import com.utm.emergency.model.EmergencyConfig;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.repository.EmergencyConfigRepository;
import com.utm.emergency.viewmodel.config.ConfigValueVm;
import com.utm.emergency.viewmodel.config.EmergencyConfigVm;
import com.utm.emergency.viewmodel.config.EmergencySystemConfigVm;
import com.utm.emergency.viewmodel.config.OperationModeVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: EmergencyConfigServiceImpl (Specification-Driven)")
class EmergencyConfigServiceImplTest {

    @Mock
    private EmergencyConfigRepository configRepo;

    @Mock
    private EmergencyConfigMapper configMapper;

    @Mock
    private DecisionEngineService decisionEngineService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private EmergencyConfigServiceImpl configService;

    private EmergencyConfig createSampleConfig(String id, String key, String value, String description) {
        EmergencyConfig config = new EmergencyConfig();
        config.setId(id);
        config.setKey(key);
        config.setValue(value);
        config.setDescription(description);
        config.setCreatedOn(ZonedDateTime.now(ZoneOffset.UTC));
        config.setLastModifiedOn(ZonedDateTime.now(ZoneOffset.UTC));
        return config;
    }

    @Nested
    @DisplayName("getSystemConfig Endpoint Tests")
    class GetSystemConfigTests {

        @Test
        @DisplayName("getSystemConfig aggregates decision engine mode and parsed config map")
        void getSystemConfig_aggregatesModeAndConfigs() throws Exception {
            EmergencyConfig config1 = createSampleConfig("c-1", "auto_timeout_seconds", "30", "Countdown timeout");
            EmergencyConfig config2 = createSampleConfig("c-2", "invalid_json_key", "raw-string-val", "Raw fallback");

            JsonNode parsedNode = mock(JsonNode.class);

            when(decisionEngineService.getMode()).thenReturn(OperationMode.supervised);
            when(configRepo.findAll()).thenReturn(List.of(config1, config2));
            when(objectMapper.readTree("30")).thenReturn(parsedNode);
            when(objectMapper.readTree("raw-string-val")).thenThrow(new JsonProcessingException("Invalid JSON") {
            });

            EmergencySystemConfigVm result = configService.getSystemConfig();

            assertThat(result).isNotNull();
            assertThat(result.mode()).isEqualTo(OperationMode.supervised);
            assertThat(result.configs()).containsKeys("auto_timeout_seconds", "invalid_json_key");
            assertThat(result.configs().get("auto_timeout_seconds")).isEqualTo(parsedNode);
            assertThat(result.configs().get("invalid_json_key")).isEqualTo("raw-string-val");
        }
    }

    @Nested
    @DisplayName("setMode Endpoint Tests")
    class SetModeTests {

        @Test
        @DisplayName("setMode delegates to decisionEngineService and returns OperationModeVm")
        void setMode_delegatesToDecisionEngineAndReturnsVm() {
            OperationModeVm result = configService.setMode(OperationMode.auto);

            assertThat(result).isNotNull();
            assertThat(result.mode()).isEqualTo(OperationMode.auto);
            verify(decisionEngineService).setMode(OperationMode.auto);
        }
    }

    @Nested
    @DisplayName("setConfig Endpoint Tests")
    class SetConfigTests {

        @Test
        @DisplayName("setConfig for existing key updates entity and saves")
        void setConfig_whenExistingKey_updatesEntity() throws Exception {
            String key = "max_divert_distance_m";
            ConfigValueVm vm = new ConfigValueVm(5000.0, "Maximum allowable diversion radius");
            JsonNode valNode = mock(JsonNode.class);
            EmergencyConfig existing = createSampleConfig("c-existing", key, "3000.0", "Old radius");
            EmergencyConfig saved = createSampleConfig("c-existing", key, "5000.0",
                    "Maximum allowable diversion radius");
            EmergencyConfigVm expectedVm = new EmergencyConfigVm("c-existing", key, valNode,
                    "Maximum allowable diversion radius", ZonedDateTime.now(ZoneOffset.UTC));

            when(objectMapper.writeValueAsString(5000.0)).thenReturn("5000.0");
            when(configRepo.findByKey(key)).thenReturn(Optional.of(existing));
            when(configRepo.save(existing)).thenReturn(saved);
            when(configMapper.toVm(saved)).thenReturn(expectedVm);

            EmergencyConfigVm result = configService.setConfig(key, vm);

            assertThat(result).isNotNull();
            assertThat(result.key()).isEqualTo(key);
            verify(configMapper).updateEntityFromVm(existing, vm, "5000.0");
            verify(configRepo).save(existing);
        }

        @Test
        @DisplayName("setConfig for new key maps to new entity and saves")
        void setConfig_whenNewKey_createsEntity() throws Exception {
            String key = "alarm_sound_enabled";
            ConfigValueVm vm = new ConfigValueVm(true, "Enable loud siren");
            JsonNode valNode = mock(JsonNode.class);
            EmergencyConfig newEntity = createSampleConfig(null, key, "true", "Enable loud siren");
            EmergencyConfig saved = createSampleConfig("c-new", key, "true", "Enable loud siren");
            EmergencyConfigVm expectedVm = new EmergencyConfigVm("c-new", key, valNode, "Enable loud siren",
                    ZonedDateTime.now(ZoneOffset.UTC));

            when(objectMapper.writeValueAsString(true)).thenReturn("true");
            when(configRepo.findByKey(key)).thenReturn(Optional.empty());
            when(configMapper.toEntity(key, vm, "true")).thenReturn(newEntity);
            when(configRepo.save(newEntity)).thenReturn(saved);
            when(configMapper.toVm(saved)).thenReturn(expectedVm);

            EmergencyConfigVm result = configService.setConfig(key, vm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("c-new");
            verify(configRepo).save(newEntity);
        }
    }
}
