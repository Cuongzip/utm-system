package com.utm.intelligence.controller;

import com.utm.intelligence.service.CopilotService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatPostVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatResponseVm;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/copilot")
@RequiredArgsConstructor
@Tag(name = "Operations Copilot", description = "Natural-language UTM assistant with live read tools and confirm-gated action proposals")
public class CopilotController {

    private final CopilotService copilotService;

    @PostMapping("/chat")
    @Operation(summary = "Operations Copilot NL chat over live UTM services")
    public ResponseEntity<CopilotChatResponseVm> chat(@RequestBody(required = false) CopilotChatPostVm postVm) {
        return ResponseEntity.ok(copilotService.chat(postVm));
    }
}
