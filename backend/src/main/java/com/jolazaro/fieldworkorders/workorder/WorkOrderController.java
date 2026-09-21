package com.jolazaro.fieldworkorders.workorder;

import java.io.IOException;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.jolazaro.fieldworkorders.security.CurrentUserService;
import com.jolazaro.fieldworkorders.user.AppUser;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/work-orders")
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final CurrentUserService currentUserService;

    public WorkOrderController(WorkOrderService workOrderService, CurrentUserService currentUserService) {
        this.workOrderService = workOrderService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public WorkOrderListResult list(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) WorkOrderPriority priority,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort) {
        return workOrderService.list(
                currentUserService.requireUser(), status, priority, unassigned, q, page, size, sort);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) WorkOrderStatus status,
            @RequestParam(required = false) WorkOrderPriority priority,
            @RequestParam(required = false) Boolean unassigned,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "updatedAt,desc") String sort) {
        byte[] body = workOrderService.exportExcel(
                currentUserService.requireUser(), status, priority, unassigned, q, sort);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ordenes.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(body);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkOrderResponse create(@Valid @RequestBody CreateWorkOrderRequest request) {
        return workOrderService.create(currentUserService.requireUser(), request);
    }

    @GetMapping("/{id}")
    public WorkOrderDetailResponse get(@PathVariable Long id) {
        return workOrderService.get(currentUserService.requireUser(), id);
    }

    @PostMapping("/{id}/assignment")
    public WorkOrderResponse assign(@PathVariable Long id, @RequestBody(required = false) AssignmentRequest request) {
        AssignmentRequest body = request == null ? new AssignmentRequest(null) : request;
        return workOrderService.assign(currentUserService.requireUser(), id, body);
    }

    @PostMapping("/{id}/status")
    public WorkOrderResponse changeStatus(@PathVariable Long id, @Valid @RequestBody StatusChangeRequest request) {
        return workOrderService.changeStatus(currentUserService.requireUser(), id, request.status());
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WorkOrderResponse uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file)
            throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File must be an image");
        }
        return workOrderService.uploadPhoto(
                currentUserService.requireUser(),
                id,
                file.getContentType(),
                file.getBytes());
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Long id) {
        AppUser actor = currentUserService.requireUser();
        StoredPhoto photo = workOrderService.loadPhoto(actor, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .body(photo.bytes());
    }

    @PostMapping("/{id}/location")
    public WorkOrderResponse updateLocation(@PathVariable Long id, @Valid @RequestBody LocationRequest request) {
        return workOrderService.updateLocation(currentUserService.requireUser(), id, request);
    }
}
