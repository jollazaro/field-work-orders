package com.jolazaro.fieldworkorders.workorder;

import org.springframework.data.jpa.domain.Specification;

import com.jolazaro.fieldworkorders.common.TextSearch;
import com.jolazaro.fieldworkorders.user.AppUser;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

final class WorkOrderSpecs {

    private WorkOrderSpecs() {
    }

    static Specification<WorkOrder> list(
            WorkOrderStatus status,
            WorkOrderPriority priority,
            Boolean unassigned,
            boolean restrictToTechnician,
            AppUser technician,
            String q) {
        return (root, query, cb) -> {
            Predicate predicate = cb.conjunction();

            if (status != null) {
                predicate = cb.and(predicate, cb.equal(root.get("status"), status));
            }
            if (priority != null) {
                predicate = cb.and(predicate, cb.equal(root.get("priority"), priority));
            }
            if (Boolean.TRUE.equals(unassigned)) {
                predicate = cb.and(predicate, cb.isNull(root.get("assignedTechnician")));
            } else if (Boolean.FALSE.equals(unassigned)) {
                predicate = cb.and(predicate, cb.isNotNull(root.get("assignedTechnician")));
            }

            Join<WorkOrder, AppUser> technicianJoin = null;
            if (restrictToTechnician) {
                technicianJoin = root.join("assignedTechnician", JoinType.LEFT);
                predicate = cb.and(
                        predicate,
                        cb.or(
                                cb.isNull(root.get("assignedTechnician")),
                                cb.equal(root.get("assignedTechnician"), technician)));
            }

            String pattern = TextSearch.containsPattern(q);
            if (!pattern.isEmpty()) {
                if (technicianJoin == null) {
                    technicianJoin = root.join("assignedTechnician", JoinType.LEFT);
                }
                Predicate title = cb.like(cb.function("fold_accents", String.class, root.get("title")), pattern, '\\');
                Predicate site = cb.like(cb.function("fold_accents", String.class, root.get("site")), pattern, '\\');
                Predicate instruction =
                        cb.like(cb.function("fold_accents", String.class, root.get("instruction")), pattern, '\\');
                Predicate email = cb.like(
                        cb.function("fold_accents", String.class, technicianJoin.get("email")), pattern, '\\');
                predicate = cb.and(predicate, cb.or(title, site, instruction, email));
                if (query != null) {
                    query.distinct(true);
                }
            }

            return predicate;
        };
    }
}
