package com.jolazaro.fieldworkorders.workorder;

import java.util.List;

import org.springframework.data.domain.Page;

/** Paginated list payload for {@code GET /api/work-orders}. */
public record WorkOrderListResult(
        List<WorkOrderResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    static WorkOrderListResult from(Page<WorkOrder> page) {
        return new WorkOrderListResult(
                page.getContent().stream().map(WorkOrderResponse::from).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
