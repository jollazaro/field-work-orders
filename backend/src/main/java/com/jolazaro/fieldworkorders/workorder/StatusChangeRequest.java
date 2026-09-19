package com.jolazaro.fieldworkorders.workorder;

import jakarta.validation.constraints.NotNull;

public record StatusChangeRequest(@NotNull WorkOrderStatus status) {
}
