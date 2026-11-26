package com.utm.mission.controller;

import com.utm.mission.service.MissionTemplateService;
import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.template.MissionTemplateInstantiatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplateListVm;
import com.utm.mission.viewmodel.template.MissionTemplatePostVm;
import com.utm.mission.viewmodel.template.MissionTemplatePutVm;
import com.utm.mission.viewmodel.template.MissionTemplateVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
@Tag(name = "Mission Templates", description = "Endpoints for versioned reusable mission templates and blueprint instantiation")
public class MissionTemplateController {

    private final MissionTemplateService templateService;

    @PostMapping
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new mission template")
    public ResponseEntity<MissionTemplateVm> createTemplate(@Valid @RequestBody MissionTemplatePostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.createTemplate(postVm));
    }

    @GetMapping
    @Operation(summary = "List latest mission templates")
    public ResponseEntity<MissionTemplateListVm> getTemplates(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean published,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int effectiveLimit = limit != null ? limit : size;
        int effectiveOffset = offset != null ? offset : page * effectiveLimit;
        return ResponseEntity.ok(templateService.getTemplates(category, published, search, effectiveLimit, effectiveOffset));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get template by ID or code (latest version)")
    public ResponseEntity<MissionTemplateVm> getTemplateById(@PathVariable String id) {
        return ResponseEntity.ok(templateService.getTemplateById(id));
    }

    @GetMapping("/{id}/versions")
    @Operation(summary = "Get all versions of a template")
    public ResponseEntity<List<MissionTemplateVm>> getTemplateVersions(@PathVariable String id) {
        return ResponseEntity.ok(templateService.getTemplateVersions(id));
    }

    @GetMapping("/{id}/versions/{version}")
    @Operation(summary = "Get specific version of a template")
    public ResponseEntity<MissionTemplateVm> getTemplateVersion(
            @PathVariable String id,
            @PathVariable int version) {
        return ResponseEntity.ok(templateService.getTemplateVersion(id, version));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @Operation(summary = "Update template (creates a new immutable version)")
    public ResponseEntity<MissionTemplateVm> updateTemplate(
            @PathVariable String id,
            @Valid @RequestBody MissionTemplatePutVm putVm) {
        return ResponseEntity.ok(templateService.updateTemplate(id, putVm));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Publish template")
    public ResponseEntity<MissionTemplateVm> publishTemplate(@PathVariable String id) {
        return ResponseEntity.ok(templateService.publishTemplate(id));
    }

    @PostMapping("/{id}/unpublish")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Unpublish template")
    public ResponseEntity<MissionTemplateVm> unpublishTemplate(@PathVariable String id) {
        return ResponseEntity.ok(templateService.unpublishTemplate(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('hub_operator', 'admin')")
    @Operation(summary = "Delete template and all versions (blocked if usageCount > 0)")
    public ResponseEntity<Map<String, String>> deleteTemplate(@PathVariable String id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.ok(Map.of("message", "Template deleted successfully"));
    }

    @PostMapping("/{id}/instantiate")
    @PreAuthorize("hasAnyRole('hub_operator', 'pilot', 'admin')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Instantiate a draft mission from a template with variable interpolation")
    public ResponseEntity<MissionVm> instantiateTemplate(
            @PathVariable String id,
            @RequestBody(required = false) MissionTemplateInstantiatePostVm postVm) {
        return ResponseEntity.status(HttpStatus.CREATED).body(templateService.instantiateTemplate(id, postVm));
    }
}
