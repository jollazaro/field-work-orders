package com.jolazaro.fieldworkorders.workorder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.jolazaro.fieldworkorders.user.AppUser;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "work_orders")
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 200)
    private String site;

    @Column(nullable = false, length = 2000)
    private String instruction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private WorkOrderPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private WorkOrderStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_technician_id")
    private AppUser assignedTechnician;

    @Column(name = "photo_content_type", length = 100)
    private String photoContentType;

    @Column
    private Double lat;

    @Column
    private Double lng;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("changedAt ASC")
    private List<WorkOrderStatusEvent> statusHistory = new ArrayList<>();

    protected WorkOrder() {
    }

    public WorkOrder(
            String title,
            String site,
            String instruction,
            WorkOrderPriority priority,
            WorkOrderStatus status,
            AppUser assignedTechnician) {
        this.title = title;
        this.site = site;
        this.instruction = instruction;
        this.priority = priority;
        this.status = status;
        this.assignedTechnician = assignedTechnician;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void addStatusEvent(WorkOrderStatus fromStatus, WorkOrderStatus toStatus, String changedByEmail) {
        statusHistory.add(new WorkOrderStatusEvent(this, fromStatus, toStatus, changedByEmail, Instant.now()));
    }

    public boolean hasPhoto() {
        return photoContentType != null;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getSite() {
        return site;
    }

    public String getInstruction() {
        return instruction;
    }

    public WorkOrderPriority getPriority() {
        return priority;
    }

    public WorkOrderStatus getStatus() {
        return status;
    }

    public void setStatus(WorkOrderStatus status) {
        this.status = status;
    }

    public AppUser getAssignedTechnician() {
        return assignedTechnician;
    }

    public void setAssignedTechnician(AppUser assignedTechnician) {
        this.assignedTechnician = assignedTechnician;
    }

    public String getPhotoContentType() {
        return photoContentType;
    }

    public void setPhotoContentType(String photoContentType) {
        this.photoContentType = photoContentType;
    }

    public Double getLat() {
        return lat;
    }

    public Double getLng() {
        return lng;
    }

    public void setLocation(Double lat, Double lng) {
        this.lat = lat;
        this.lng = lng;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<WorkOrderStatusEvent> getStatusHistory() {
        return statusHistory;
    }
}
