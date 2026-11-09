package com.utm.commonlibrary.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.viewmodel.error.ErrorVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit Tests: ApiExceptionHandler & Parameterized Error Contract")
class ApiExceptionHandlerTest {

    private ApiExceptionHandler handler;
    private WebRequest webRequest;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        handler = new ApiExceptionHandler();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/test");
        webRequest = new ServletWebRequest(request);
        objectMapper = new ObjectMapper();
    }

    @Nested
    @DisplayName("1. Semantic Parameters & ErrorVm Contract Tests")
    class SemanticParametersTests {

        @Test
        @DisplayName("NotFoundException with explicit ID param returns status 404, clean detail, and params.id")
        void notFoundException_explicitIdParam_returnsCorrectContract() {
            NotFoundException ex = new NotFoundException(MessageCode.HUB_NOT_FOUND, "id",
                    "123e4567-e89b-12d3-a456-426614174000");

            ResponseEntity<ErrorVm> response = handler.handleNotFoundException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.statusCode()).isEqualTo("404 NOT_FOUND");
            assertThat(body.errorCode()).isEqualTo(MessageCode.HUB_NOT_FOUND);
            assertThat(body.title()).isEqualTo("Not Found");
            assertThat(body.detail()).isEqualTo("Hub / Vertiport is not found");
            assertThat(body.params()).containsExactlyEntriesOf(Map.of("id", "123e4567-e89b-12d3-a456-426614174000"));
            assertThat(body.params()).doesNotContainKey("identifier");
            assertThat(body.fieldErrors()).isEmpty();
        }

        @Test
        @DisplayName("NotFoundException with explicit code param returns params.code without duplicate aliases")
        void notFoundException_explicitCodeParam_returnsOnlyCodeParam() {
            NotFoundException ex = new NotFoundException(MessageCode.AIRSPACE_ZONE_NOT_FOUND, "code", "ASZ-101");

            ResponseEntity<ErrorVm> response = handler.handleNotFoundException(ex, webRequest);

            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isEqualTo(MessageCode.AIRSPACE_ZONE_NOT_FOUND);
            assertThat(body.params()).containsExactlyEntriesOf(Map.of("code", "ASZ-101"));
            assertThat(body.params()).doesNotContainKey("identifier");
            assertThat(body.detail()).doesNotContain("ASZ-101");
        }

        @Test
        @DisplayName("DuplicatedException with explicit flightNumber returns status 409 and params.flightNumber")
        void duplicatedException_explicitFlightNumber_returnsCorrectContract() {
            DuplicatedException ex = new DuplicatedException(MessageCode.FLIGHT_NUMBER_ALREADY_EXISTED, "flightNumber",
                    "FLT-20261108-A9B2");

            ResponseEntity<ErrorVm> response = handler.handleDuplicated(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.statusCode()).isEqualTo("409 CONFLICT");
            assertThat(body.errorCode()).isEqualTo(MessageCode.FLIGHT_NUMBER_ALREADY_EXISTED);
            assertThat(body.detail()).isEqualTo("Flight number already exists");
            assertThat(body.params()).containsExactlyEntriesOf(Map.of("flightNumber", "FLT-20261108-A9B2"));
            assertThat(body.params()).doesNotContainKey("identifier");
        }

        @Test
        @DisplayName("BadRequestException with arbitrary multiple params returns all semantic params")
        void badRequestException_multipleParams_returnsAllEntries() {
            Map<String, Object> params = Map.of(
                    "minAltitude", 50,
                    "maxAltitude", 120,
                    "unit", "meters");
            BadRequestException ex = new BadRequestException("ALTITUDE_OUT_OF_BOUNDS", params);

            ResponseEntity<ErrorVm> response = handler.handleBadRequestException(ex, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.params()).containsAllEntriesOf(params);
            assertThat(body.params()).doesNotContainKey("identifier");
        }

        @Test
        @DisplayName("Exception with empty or null params safely defaults to empty map")
        void exception_emptyParams_defaultsToEmptyMap() {
            BadRequestException ex = new BadRequestException(MessageCode.SCHEDULED_TIME_MUST_BE_FUTURE);

            ResponseEntity<ErrorVm> response = handler.handleBadRequestException(ex, webRequest);

            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.params()).isNotNull().isEmpty();
            assertThat(body.fieldErrors()).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("ErrorVm compact constructor guarantees null safety for params and fieldErrors")
        void errorVm_nullSafety_guaranteesNonNullCollections() {
            ErrorVm vm = new ErrorVm("400", "TEST_ERROR", "Title", "Detail", null, null);

            assertThat(vm.params()).isNotNull().isEmpty();
            assertThat(vm.fieldErrors()).isNotNull().isEmpty();
        }
    }

    @Nested
    @DisplayName("2. Legacy Constructor Compatibility Tests")
    class LegacyCompatibilityTests {

        @Test
        @DisplayName("Legacy varargs call maps to exact key for known codes without identifier alias")
        void legacyVarargs_knownCode_mapsToExactSemanticKey() {
            NotFoundException ex = new NotFoundException(MessageCode.HUB_NOT_FOUND, "HUB-SGN-01");

            ResponseEntity<ErrorVm> response = handler.handleNotFoundException(ex, webRequest);

            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isEqualTo(MessageCode.HUB_NOT_FOUND);
            assertThat(body.detail()).isEqualTo("Hub / Vertiport is not found");
            assertThat(body.params()).containsExactlyEntriesOf(Map.of("id", "HUB-SGN-01"));
            assertThat(body.params()).doesNotContainKey("identifier");
        }

        @Test
        @DisplayName("Legacy varargs for code already exists maps to 'code'")
        void legacyVarargs_hubCodeAlreadyExists_mapsToCode() {
            DuplicatedException ex = new DuplicatedException(MessageCode.HUB_CODE_ALREADY_EXISTED, "HUB-DAD");

            ResponseEntity<ErrorVm> response = handler.handleDuplicated(ex, webRequest);

            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isEqualTo(MessageCode.HUB_CODE_ALREADY_EXISTED);
            assertThat(body.params()).containsExactlyEntriesOf(Map.of("code", "HUB-DAD"));
            assertThat(body.params()).doesNotContainKey("identifier");
        }

        @Test
        @DisplayName("Legacy varargs for unknown errorCode returns empty params rather than guessing")
        void legacyVarargs_unknownErrorCode_returnsEmptyParams() {
            NotFoundException ex = new NotFoundException("TOTALLY_UNKNOWN_CODE", "some-arg");

            ResponseEntity<ErrorVm> response = handler.handleNotFoundException(ex, webRequest);

            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.errorCode()).isEqualTo("TOTALLY_UNKNOWN_CODE");
            assertThat(body.params()).isEmpty();
        }

        @Test
        @DisplayName("Legacy ErrorVm 3-arg constructor preserves backward compatibility")
        void legacyErrorVm_3ArgConstructor_worksAsExpected() {
            ErrorVm vm = new ErrorVm("404 NOT_FOUND", "Not Found", "Item not found");

            assertThat(vm.statusCode()).isEqualTo("404 NOT_FOUND");
            assertThat(vm.title()).isEqualTo("Not Found");
            assertThat(vm.detail()).isEqualTo("Item not found");
            assertThat(vm.errorCode()).isNull();
            assertThat(vm.params()).isEmpty();
            assertThat(vm.fieldErrors()).isEmpty();
        }

        @Test
        @DisplayName("Legacy ErrorVm 4-arg constructor preserves backward compatibility")
        void legacyErrorVm_4ArgConstructor_worksAsExpected() {
            List<String> fieldErrors = List.of("name is required");
            ErrorVm vm = new ErrorVm("400 BAD_REQUEST", "Bad Request", "Validation failed", fieldErrors);

            assertThat(vm.fieldErrors()).containsExactly("name is required");
            assertThat(vm.params()).isEmpty();
        }
    }

    @Nested
    @DisplayName("3. Security & HTTP 500 Hardening Tests")
    class SecurityTests {

        @Test
        @DisplayName("HTTP 500 handler masks SQL exception message and returns generic detail")
        void handleOtherException_sqlException_neverExposesSensitiveDetails() {
            Exception sqlException = new RuntimeException(
                    "PSQLException: ERROR: relation 'users' does not exist (SQL: SELECT * FROM users)");

            ResponseEntity<ErrorVm> response = handler.handleOtherException(sqlException, webRequest);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
            ErrorVm body = response.getBody();
            assertThat(body).isNotNull();
            assertThat(body.statusCode()).isEqualTo("500 INTERNAL_SERVER_ERROR");
            assertThat(body.errorCode()).isEqualTo("INTERNAL_SERVER_ERROR");
            assertThat(body.title()).isEqualTo("Internal Server Error");
            assertThat(body.detail()).isEqualTo("An unexpected internal error occurred");
            assertThat(body.detail()).doesNotContain("PSQLException");
            assertThat(body.detail()).doesNotContain("users");
            assertThat(body.detail()).doesNotContain("SELECT");
            assertThat(body.params()).isEmpty();
        }
    }

    @Nested
    @DisplayName("4. JSON Serialization Compatibility Tests")
    class JsonSerializationTests {

        @Test
        @DisplayName("ErrorVm serializes cleanly into JSON with all 6 expected fields")
        void errorVm_jacksonSerialization_containsExpectedJsonKeys() throws Exception {
            ErrorVm vm = new ErrorVm(
                    "404 NOT_FOUND",
                    MessageCode.HUB_NOT_FOUND,
                    "Not Found",
                    "Hub / Vertiport is not found",
                    Map.of("id", "HUB-1"),
                    Collections.emptyList());

            String json = objectMapper.writeValueAsString(vm);

            assertThat(json).contains("\"statusCode\":\"404 NOT_FOUND\"");
            assertThat(json).contains("\"errorCode\":\"" + MessageCode.HUB_NOT_FOUND + "\"");
            assertThat(json).contains("\"title\":\"Not Found\"");
            assertThat(json).contains("\"detail\":\"Hub / Vertiport is not found\"");
            assertThat(json).contains("\"params\":{\"id\":\"HUB-1\"}");
            assertThat(json).contains("\"fieldErrors\":[]");
            assertThat(json).doesNotContain("\"identifier\"");
        }
    }
}
