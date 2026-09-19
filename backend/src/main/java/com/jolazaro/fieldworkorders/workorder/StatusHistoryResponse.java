package com.jolazaro.fieldworkorders.workorder;

import java.time.Instant;

public record StatusHistoryResponse(
        WorkOrderStatus fromStatus,
        WorkOrderStatus toStatus,
        String changedByEmail,
        Instant changedAt) {

    static StatusHistoryResponse from(WorkOrderStatusEvent event) {
        return new StatusHistoryResponse(
                event.getFromStatus(),
                event.getToStatus(),
                event.getChangedByEmail(),
                event.getChangedAt());
    }
}
