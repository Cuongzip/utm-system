package com.utm.mission.viewmodel.template;

import java.util.List;

public record MissionTemplateListVm(
        List<MissionTemplateVm> items,
        long total
) {
    public static MissionTemplateListVm of(List<MissionTemplateVm> items, long total) {
        return new MissionTemplateListVm(items, total);
    }
}
