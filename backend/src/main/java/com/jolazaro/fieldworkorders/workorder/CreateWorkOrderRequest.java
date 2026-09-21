package com.jolazaro.fieldworkorders.workorder;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateWorkOrderRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 200) String site,
        @NotBlank @Size(max = 2000) String instruction,
        @NotNull WorkOrderPriority priority,
        Long assignedTechnicianId,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng) {
}
