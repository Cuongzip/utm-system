package com.utm.mission.service;

import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.template.MissionTemplateInstantiatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplateListVm;
import com.utm.mission.viewmodel.template.MissionTemplatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplatePutVm;
import com.utm.mission.viewmodel.template.MissionTemplateVm;

import java.util.List;

public interface MissionTemplateService {

    MissionTemplateVm createTemplate(MissionTemplatePostVm postVm);

    MissionTemplateListVm getTemplates(String category, Boolean published, String search, Integer limit, Integer offset);

    MissionTemplateVm getTemplateById(String id);

    List<MissionTemplateVm> getTemplateVersions(String id);

    MissionTemplateVm getTemplateVersion(String id, int version);

    MissionTemplateVm updateTemplate(String id, MissionTemplatePutVm putVm);

    MissionTemplateVm publishTemplate(String id);

    MissionTemplateVm unpublishTemplate(String id);

    void deleteTemplate(String id);

    MissionVm instantiateTemplate(String id, MissionTemplateInstantiatePostVm postVm);
}
