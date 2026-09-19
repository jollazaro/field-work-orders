package com.jolazaro.fieldworkorders.workorder;

import java.time.Instant;
import java.util.List;

public record WorkOrderDetailResponse(
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
        Instant updatedAt,
        List<StatusHistoryResponse> statusHistory) {

    static WorkOrderDetailResponse from(WorkOrder order) {
        WorkOrderResponse base = WorkOrderResponse.from(order);
        return new WorkOrderDetailResponse(
                base.id(),
                base.title(),
                base.site(),
                base.instruction(),
                base.priority(),
                base.status(),
                base.assignedTechnicianId(),
                base.assignedTechnicianEmail(),
                base.photoUrl(),
                base.lat(),
                base.lng(),
                base.createdAt(),
                base.updatedAt(),
                order.getStatusHistory().stream().map(StatusHistoryResponse::from).toList());
    }
}
