package com.jolazaro.fieldworkorders.workorder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.lang.Nullable;
import org.springframework.web.server.ResponseStatusException;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {

    Set<String> SORTABLE = Set.of("updatedAt", "createdAt", "title", "site", "status", "priority");

    int DEFAULT_SIZE = 10;
    int MAX_SIZE = 50;

    @Override
    @EntityGraph(attributePaths = "assignedTechnician")
    Page<WorkOrder> findAll(@Nullable Specification<WorkOrder> spec, Pageable pageable);

    @EntityGraph(attributePaths = "assignedTechnician")
    List<WorkOrder> findAll(@Nullable Specification<WorkOrder> spec, Sort sort);

    @Query("""
            select w from WorkOrder w
            left join fetch w.assignedTechnician
            left join fetch w.statusHistory
            where w.id = :id
            """)
    Optional<WorkOrder> findDetailById(@Param("id") Long id);

    static Pageable toPageable(int page, int size, String sort) {
        int safePage = Math.max(page, 0);
        int safeSize = size < 1 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        return PageRequest.of(safePage, safeSize, parseSort(sort));
    }

    static Sort parseSort(String sort) {
        String raw = (sort == null || sort.isBlank()) ? "updatedAt,desc" : sort.trim();
        String[] parts = raw.split(",", 2);
        String property = parts[0].trim();
        if (!SORTABLE.contains(property)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid sort property. Allowed: " + String.join(", ", SORTABLE));
        }
        Sort.Direction direction = Sort.Direction.DESC;
        if (parts.length > 1) {
            String dir = parts[1].trim();
            if ("asc".equalsIgnoreCase(dir)) {
                direction = Sort.Direction.ASC;
            } else if ("desc".equalsIgnoreCase(dir)) {
                direction = Sort.Direction.DESC;
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sort direction. Use asc or desc");
            }
        }
        return Sort.by(direction, property);
    }
}
