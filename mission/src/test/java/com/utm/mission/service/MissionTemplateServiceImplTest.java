package com.utm.mission.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.mission.mapper.MissionTemplateMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.MissionTemplate;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.MissionTemplateRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.template.MissionBlueprintVm;
import com.utm.mission.viewmodel.template.MissionTemplateInstantiatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplatePutVm;
import com.utm.mission.viewmodel.template.MissionTemplateVm;
import com.utm.mission.viewmodel.template.TemplateVariableVm;
import com.utm.mission.viewmodel.template.WaypointBlueprintVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: MissionTemplateServiceImpl")
class MissionTemplateServiceImplTest {

    @Mock
    private MissionTemplateRepository templateRepository;

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private WaypointRepository waypointRepository;

    @Mock
    private MissionTemplateMapper templateMapper;

    @Mock
    private MissionService missionService;

    @Mock
    private HubClientService hubClientService;

    @InjectMocks
    private MissionTemplateServiceImpl templateService;

    @Test
    @DisplayName("createTemplate - generates TPL code and saves version 1")
    void createTemplate_generatesCodeAndSavesVersionOne() {
        MissionBlueprintVm blueprint = new MissionBlueprintVm(
                List.of(), MissionScheduleType.IMMEDIATE, null, List.of("bvlos"), 1.0, 300, 4500.0);
        MissionTemplatePostVm postVm = new MissionTemplatePostVm(
                null, "Medical Corridor Route", "Hospital shuttle", "Delivery", List.of("medical"), List.of(), blueprint);

        MissionTemplate mapped = new MissionTemplate();
        mapped.setBlueprint(blueprint);
        when(templateRepository.existsByCode(any())).thenReturn(false);
        when(templateMapper.toEntity(postVm)).thenReturn(mapped);
        when(templateRepository.save(mapped)).thenAnswer(inv -> {
            MissionTemplate arg = inv.getArgument(0);
            arg.setId("tpl-1");
            return arg;
        });
        when(templateMapper.toVm(mapped)).thenAnswer(inv -> {
            MissionTemplate arg = inv.getArgument(0);
            return new MissionTemplateVm(arg.getId(), arg.getCode(), arg.getName(), arg.getDescription(),
                    arg.getCategory(), arg.getTags(), arg.getVariables(), arg.getBlueprint(),
                    arg.getVersion(), arg.getIsLatest(), arg.getPreviousVersionId(), arg.getChangelog(),
                    arg.getUsageCount(), arg.getIsPublished(), arg.getPublishedAt(), null, null, null, null);
        });

        MissionTemplateVm result = templateService.createTemplate(postVm);

        assertThat(result.code()).startsWith("TPL-");
        assertThat(result.category()).isEqualTo("delivery");
        assertThat(result.version()).isEqualTo(1);
        assertThat(result.isLatest()).isTrue();
    }

    @Test
    @DisplayName("updateTemplate - marks existing version not latest and creates version + 1")
    void updateTemplate_createsNewVersionAndMarksOldNotLatest() {
        MissionBlueprintVm blueprint = new MissionBlueprintVm(
                List.of(), MissionScheduleType.IMMEDIATE, null, null, 0.0, 120, 1800.0);
        MissionTemplate existing = MissionTemplate.builder()
                .id("tpl-v1")
                .code("TPL-261124-ABCD")
                .name("Port Patrol")
                .category("patrol")
                .blueprint(blueprint)
                .version(1)
                .isLatest(true)
                .usageCount(2)
                .isPublished(true)
                .build();

        when(templateRepository.findByIdAndIsLatestTrue("tpl-v1")).thenReturn(Optional.of(existing));
        when(templateRepository.save(any(MissionTemplate.class))).thenAnswer(inv -> {
            MissionTemplate arg = inv.getArgument(0);
            if (arg.getId() == null) {
                arg.setId("tpl-v2");
            }
            return arg;
        });
        when(templateMapper.toVm(any(MissionTemplate.class))).thenAnswer(inv -> {
            MissionTemplate arg = inv.getArgument(0);
            return new MissionTemplateVm(arg.getId(), arg.getCode(), arg.getName(), arg.getDescription(),
                    arg.getCategory(), arg.getTags(), arg.getVariables(), arg.getBlueprint(),
                    arg.getVersion(), arg.getIsLatest(), arg.getPreviousVersionId(), arg.getChangelog(),
                    arg.getUsageCount(), arg.getIsPublished(), arg.getPublishedAt(), null, null, null, null);
        });

        MissionTemplatePutVm putVm = new MissionTemplatePutVm(
                "Port Patrol v2", null, null, null, null, null, "Added coastal leg");
        MissionTemplateVm updated = templateService.updateTemplate("tpl-v1", putVm);

        assertThat(existing.getIsLatest()).isFalse();
        assertThat(updated.version()).isEqualTo(2);
        assertThat(updated.previousVersionId()).isEqualTo("tpl-v1");
        assertThat(updated.changelog()).isEqualTo("Added coastal leg");
        verify(templateRepository).saveAndFlush(existing);
    }

    @Test
    @DisplayName("deleteTemplate - throws BadRequestException when usageCount > 0")
    void deleteTemplate_whenUsed_throwsBadRequest() {
        MissionTemplate used = MissionTemplate.builder()
                .id("tpl-used")
                .code("TPL-USED")
                .version(1)
                .isLatest(true)
                .usageCount(1)
                .build();
        when(templateRepository.findByIdAndIsLatestTrue("tpl-used")).thenReturn(Optional.of(used));
        when(templateRepository.findByCodeOrderByVersionDesc("TPL-USED")).thenReturn(List.of(used));

        assertThatThrownBy(() -> templateService.deleteTemplate("tpl-used"))
                .isInstanceOf(BadRequestException.class);

        verify(templateRepository, never()).deleteAll(any());
    }

    @Test
    @DisplayName("instantiateTemplate - interpolates variables, creates draft mission & waypoints, increments usageCount")
    void instantiateTemplate_interpolatesVariablesAndCreatesMission() {
        TemplateVariableVm hubVar = new TemplateVariableVm("departure_hub", "Departure Hub", "hub", true, null, null);
        TemplateVariableVm altVar = new TemplateVariableVm("cruise_alt", "Cruise Altitude", "number", true, 60.0, null);
        WaypointBlueprintVm wp1 = new WaypointBlueprintVm(
                1, "Start {{region}}", 10.7769, 106.7009, "${cruise_alt}", 14.0, 90.0, 10.0,
                null, null, null, 0.0, 15, false, null, null);
        WaypointBlueprintVm wp2 = new WaypointBlueprintVm(
                2, "End {{region}}", 10.7554, 106.6598, "${cruise_alt}", 14.0, 180.0, 10.0,
                null, null, null, 0.0, 10, true, null, null);
        MissionBlueprintVm blueprint = new MissionBlueprintVm(
                List.of(wp1, wp2), MissionScheduleType.MANUAL, null, List.of("thermal_camera"), 1.5, null, null);

        MissionTemplate template = MissionTemplate.builder()
                .id("tpl-inst")
                .code("TPL-INST")
                .name("Grid Survey {{region}}")
                .description("Inspect {{region}}")
                .variables(List.of(hubVar, altVar))
                .blueprint(blueprint)
                .version(3)
                .isLatest(true)
                .usageCount(0)
                .build();

        HubBriefVm depHub = new HubBriefVm("hub-dep", "HUB-DEP", "Saigon Hub", 10.7769, 106.7009, null);

        when(templateRepository.findByIdAndIsLatestTrue("tpl-inst")).thenReturn(Optional.of(template));
        when(hubClientService.getHubById("hub-dep")).thenReturn(Optional.of(depHub));
        when(missionRepository.existsByCode(any())).thenReturn(false);
        when(missionRepository.save(any(Mission.class))).thenAnswer(inv -> {
            Mission m = inv.getArgument(0);
            m.setId("msn-from-tpl");
            return m;
        });

        MissionVm expectedVm = new MissionVm("msn-from-tpl", "MSN-001", "Grid Survey Saigon", "Inspect Saigon",
                "hub-dep", "hub-dep", MissionScheduleType.MANUAL, null, MissionStatus.DRAFT,
                2, 5000.0, List.of(), depHub, depHub, null, null, null, null);
        when(missionService.getMissionById("msn-from-tpl")).thenReturn(expectedVm);

        MissionTemplateInstantiatePostVm req = new MissionTemplateInstantiatePostVm(
                null,
                Map.of("departure_hub", "hub-dep", "cruise_alt", 75.0, "region", "Saigon"),
                null, null, "drone-1", "pilot-1", null, null);

        MissionVm created = templateService.instantiateTemplate("tpl-inst", req);

        assertThat(created.id()).isEqualTo("msn-from-tpl");
        assertThat(template.getUsageCount()).isEqualTo(1);

        ArgumentCaptor<Waypoint> wpCaptor = ArgumentCaptor.forClass(Waypoint.class);
        verify(waypointRepository, times(4)).save(wpCaptor.capture());
        assertThat(wpCaptor.getAllValues().get(0).getWaypointType())
                .isEqualTo(com.utm.mission.model.enumeration.WaypointType.HUB);
        assertThat(wpCaptor.getAllValues().get(1).getAltitude()).isEqualTo(75.0);
        assertThat(wpCaptor.getAllValues().get(1).getName()).isEqualTo("Start Saigon");
        assertThat(wpCaptor.getAllValues().get(2).getWaitForConfirmation()).isTrue();
        assertThat(wpCaptor.getAllValues().get(3).getWaypointType())
                .isEqualTo(com.utm.mission.model.enumeration.WaypointType.HUB);
    }
}
