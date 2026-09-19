package com.jolazaro.fieldworkorders.workorder;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "work_order_status_events")
public class WorkOrderStatusEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 32)
    private WorkOrderStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 32)
    private WorkOrderStatus toStatus;

    @Column(nullable = false, length = 255)
    private String changedByEmail;

    @Column(nullable = false)
    private Instant changedAt;

    protected WorkOrderStatusEvent() {
    }

    public WorkOrderStatusEvent(
            WorkOrder workOrder,
            WorkOrderStatus fromStatus,
            WorkOrderStatus toStatus,
            String changedByEmail,
            Instant changedAt) {
        this.workOrder = workOrder;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.changedByEmail = changedByEmail;
        this.changedAt = changedAt;
    }

    public WorkOrderStatus getFromStatus() {
        return fromStatus;
    }

    public WorkOrderStatus getToStatus() {
        return toStatus;
    }

    public String getChangedByEmail() {
        return changedByEmail;
    }

    public Instant getChangedAt() {
        return changedAt;
    }
}
