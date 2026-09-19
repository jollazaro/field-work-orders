package com.jolazaro.fieldworkorders.workorder;

import java.time.Instant;

public record WorkOrderResponse(
        Long id,
        String title,
        String site,
        String instruction,
        WorkOrderPriority priority,
        WorkOrderStatus status,
        Long assignedTechnicianId,
        String assignedTechnicianEmail,
        String photoUrl,
        Double lat,
        Double lng,
        Instant createdAt,
        Instant updatedAt) {

    static WorkOrderResponse from(WorkOrder order) {
        var technician = order.getAssignedTechnician();
        return new WorkOrderResponse(
                order.getId(),
                order.getTitle(),
                order.getSite(),
                order.getInstruction(),
                order.getPriority(),
                order.getStatus(),
                technician == null ? null : technician.getId(),
                technician == null ? null : technician.getEmail(),
                order.hasPhoto() ? "/api/work-orders/" + order.getId() + "/photo" : null,
                order.getLat(),
                order.getLng(),
                order.getCreatedAt(),
                order.getUpdatedAt());
    }
}
