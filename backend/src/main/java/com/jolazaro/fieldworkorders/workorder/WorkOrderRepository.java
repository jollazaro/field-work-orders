package com.jolazaro.fieldworkorders.workorder;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.jolazaro.fieldworkorders.user.AppUser;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {

    @Query("""
            select distinct w from WorkOrder w
            left join fetch w.assignedTechnician
            where (:status is null or w.status = :status)
              and (:priority is null or w.priority = :priority)
              and (:restrictToTechnician = false
                   or w.assignedTechnician is null
                   or w.assignedTechnician = :technician)
            order by w.updatedAt desc
            """)
    List<WorkOrder> search(
            @Param("status") WorkOrderStatus status,
            @Param("priority") WorkOrderPriority priority,
            @Param("restrictToTechnician") boolean restrictToTechnician,
            @Param("technician") AppUser technician);

    @Query("""
            select w from WorkOrder w
            left join fetch w.assignedTechnician
            left join fetch w.statusHistory
            where w.id = :id
            """)
    Optional<WorkOrder> findDetailById(@Param("id") Long id);
}
