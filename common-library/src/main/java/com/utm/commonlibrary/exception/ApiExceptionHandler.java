package com.utm.commonlibrary.exception;

import com.utm.commonlibrary.viewmodel.error.ErrorVm;
import jakarta.validation.ConstraintViolationException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@ControllerAdvice
@Slf4j
public class ApiExceptionHandler {
    private static final String ERROR_LOG_FORMAT = "Error: URI: {}, ErrorCode: {}, Message: {}";
    private static final String INVALID_REQUEST_INFORMATION_MESSAGE = "Request information is not valid";

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorVm> handleNotFoundException(NotFoundException ex, WebRequest request) {
        return buildBusinessResponse(HttpStatus.NOT_FOUND, ex, request, 404);
    }

    @ExceptionHandler(DuplicatedException.class)
    protected ResponseEntity<ErrorVm> handleDuplicated(DuplicatedException ex, WebRequest request) {
        return buildBusinessResponse(HttpStatus.CONFLICT, ex, request, 409);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorVm> handleBadRequestException(BadRequestException ex, WebRequest request) {
        return buildBusinessResponse(HttpStatus.BAD_REQUEST, ex, request, 400);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ErrorVm> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            WebRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .toList();

        return buildStandardResponse(status, "VALIDATION_FAILED", INVALID_REQUEST_INFORMATION_MESSAGE,
                Collections.emptyMap(), errors, ex, request, 400);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    protected ResponseEntity<ErrorVm> handleHandlerMethodValidationException(HandlerMethodValidationException ex) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        List<String> errors = ex.getAllErrors().stream()
                .map(error -> {
                    if (error instanceof FieldError fieldError) {
                        return fieldError.getField() + " " + fieldError.getDefaultMessage();
                    }
                    return error.getDefaultMessage();
                }).toList();

        return buildStandardResponse(status, "VALIDATION_FAILED", INVALID_REQUEST_INFORMATION_MESSAGE,
                Collections.emptyMap(), errors, ex, null, status.value());
    }

    @ExceptionHandler({ ConstraintViolationException.class })
    public ResponseEntity<ErrorVm> handleConstraintViolation(ConstraintViolationException ex) {
        HttpStatus status = HttpStatus.BAD_REQUEST;

        List<String> errors = ex.getConstraintViolations().stream()
                .map(violation -> String.format("%s %s: %s",
                        violation.getRootBeanClass().getName(),
                        violation.getPropertyPath(),
                        violation.getMessage()))
                .toList();

        return buildStandardResponse(status, "VALIDATION_FAILED", INVALID_REQUEST_INFORMATION_MESSAGE,
                Collections.emptyMap(), errors, ex, null, 400);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorVm> handleDataIntegrityViolationException(DataIntegrityViolationException ex,
            WebRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        log.warn("Database constraint violation at {}: {}", request != null ? getServletPath(request) : "unknown",
                ex.getMessage());
        return buildStandardResponse(status, "DATA_INTEGRITY_VIOLATION", "Database constraint violation",
                Collections.emptyMap(), Collections.emptyList(), ex, request, 400);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    protected ResponseEntity<ErrorVm> handleMissingParams(MissingServletRequestParameterException e,
            WebRequest request) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return buildStandardResponse(status, "MISSING_PARAMETER", e.getMessage(),
                Map.of("parameterName", e.getParameterName()), Collections.emptyList(), e, request, 400);
    }

    @ExceptionHandler({
            org.springframework.security.authorization.AuthorizationDeniedException.class,
            org.springframework.security.access.AccessDeniedException.class,
            com.utm.commonlibrary.exception.AccessDeniedException.class
    })
    public ResponseEntity<ErrorVm> handleAccessDeniedException(Exception ex, WebRequest request) {
        HttpStatus status = HttpStatus.FORBIDDEN;
        String message = ex.getMessage() != null && !ex.getMessage().isBlank() ? ex.getMessage() : "Access Denied";

        return buildStandardResponse(status, "ACCESS_DENIED", message,
                Collections.emptyMap(), Collections.emptyList(), ex, request, 403);
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ErrorVm> handleOtherException(Exception ex, WebRequest request) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String path = request != null ? getServletPath(request) : "unknown";

        log.error("Unhandled server exception at [{}]: ", path, ex);

        ErrorVm errorVm = new ErrorVm(
                status.toString(),
                "INTERNAL_SERVER_ERROR",
                status.getReasonPhrase(),
                "An unexpected internal error occurred",
                Collections.emptyMap(),
                Collections.emptyList());
        return ResponseEntity.status(status).body(errorVm);
    }

    private String getServletPath(WebRequest webRequest) {
        if (webRequest instanceof ServletWebRequest servletRequest) {
            return servletRequest.getRequest().getServletPath();
        }
        return "unknown";
    }

    private ResponseEntity<ErrorVm> buildBusinessResponse(HttpStatus status, BaseBusinessException ex,
            WebRequest request, int statusCode) {
        String errorCode = ex.getErrorCode() != null ? ex.getErrorCode() : status.name();
        String detail = ex.getMessage();
        Map<String, Object> params = ex.getParams();

        ErrorVm errorVm = new ErrorVm(
                status.toString(),
                errorCode,
                status.getReasonPhrase(),
                detail,
                params,
                Collections.emptyList());

        if (request != null) {
            log.warn(ERROR_LOG_FORMAT, this.getServletPath(request), statusCode, detail);
        }
        log.warn("Business Exception: {} (params: {})", detail, params);

        return ResponseEntity.status(status).body(errorVm);
    }

    private ResponseEntity<ErrorVm> buildStandardResponse(HttpStatus status, String errorCode, String detail,
            Map<String, Object> params, List<String> errors,
            Exception ex, WebRequest request, int statusCode) {
        ErrorVm errorVm = new ErrorVm(
                status.toString(),
                errorCode,
                status.getReasonPhrase(),
                detail,
                params,
                errors != null ? errors : Collections.emptyList());

        if (request != null) {
            log.warn(ERROR_LOG_FORMAT, this.getServletPath(request), statusCode, detail);
        }
        return ResponseEntity.status(status).body(errorVm);
    }
}
