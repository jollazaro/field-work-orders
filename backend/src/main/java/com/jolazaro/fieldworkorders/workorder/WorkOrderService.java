package com.jolazaro.fieldworkorders.workorder;

import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.jolazaro.fieldworkorders.user.AppUser;
import com.jolazaro.fieldworkorders.user.UserRepository;
import com.jolazaro.fieldworkorders.user.UserRole;

@Service
@Transactional
public class WorkOrderService {

    static final String NOT_ALLOWED_TO_VIEW = "Not allowed to view this work order";
    static final String ASSIGN_TECHNICIAN_FIRST = "Assign a technician first";

    private final WorkOrderRepository workOrderRepository;
    private final UserRepository userRepository;
    private final PhotoStorage photoStorage;

    public WorkOrderService(
            WorkOrderRepository workOrderRepository,
            UserRepository userRepository,
            PhotoStorage photoStorage) {
        this.workOrderRepository = workOrderRepository;
        this.userRepository = userRepository;
        this.photoStorage = photoStorage;
    }

    @Transactional(readOnly = true)
    public List<WorkOrderResponse> list(AppUser actor, WorkOrderStatus status, WorkOrderPriority priority) {
        boolean restrict = actor.getRole() == UserRole.TECHNICIAN;
        return workOrderRepository.search(status, priority, restrict, restrict ? actor : null).stream()
                .map(WorkOrderResponse::from)
                .toList();
    }

    public WorkOrderResponse create(AppUser actor, CreateWorkOrderRequest request) {
        requireSupervisor(actor, "Only supervisors can create work orders");
        AppUser technician = resolveAssignableTechnician(request.assignedTechnicianId());
        WorkOrder order = new WorkOrder(
                request.title().trim(),
                request.site().trim(),
                request.instruction().trim(),
                request.priority(),
                WorkOrderStatus.PENDING,
                technician);
        order.addStatusEvent(null, WorkOrderStatus.PENDING, actor.getEmail());
        return WorkOrderResponse.from(workOrderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public WorkOrderDetailResponse get(AppUser actor, Long id) {
        WorkOrder order = getDetail(id);
        assertCanView(actor, order);
        return WorkOrderDetailResponse.from(order);
    }

    public WorkOrderResponse assign(AppUser actor, Long id, AssignmentRequest request) {
        WorkOrder order = getDetail(id);
        assertCanView(actor, order);
        if (order.getStatus() != WorkOrderStatus.PENDING) {
            throw conflict("Work order must be pending to change assignment");
        }

        if (actor.getRole() == UserRole.SUPERVISOR) {
            if (request == null || request.technicianId() == null) {
                throw badRequest("technicianId is required");
            }
            order.setAssignedTechnician(resolveAssignableTechnician(request.technicianId()));
            return WorkOrderResponse.from(order);
        }

        if (order.getAssignedTechnician() != null) {
            throw conflict("Work order already assigned");
        }
        if (request != null && request.technicianId() != null
                && !request.technicianId().equals(actor.getId())) {
            throw forbidden("Not allowed to assign this technician");
        }
        order.setAssignedTechnician(actor);
        return WorkOrderResponse.from(order);
    }

    public WorkOrderResponse changeStatus(AppUser actor, Long id, WorkOrderStatus target) {
        WorkOrder order = getDetail(id);
        assertCanView(actor, order);
        WorkOrderStatus current = order.getStatus();
        if (current == target) {
            throw conflict("Work order is already in that status");
        }
        if (target == WorkOrderStatus.IN_PROGRESS && order.getAssignedTechnician() == null) {
            throw conflict(ASSIGN_TECHNICIAN_FIRST);
        }
        if (actor.getRole() == UserRole.TECHNICIAN && !isAssignedTo(order, actor)) {
            throw forbidden(NOT_ALLOWED_TO_VIEW);
        }
        if (!isAllowedTransition(actor.getRole(), current, target)) {
            throw conflict("Illegal status transition");
        }
        order.setStatus(target);
        order.addStatusEvent(current, target, actor.getEmail());
        return WorkOrderResponse.from(order);
    }

    public WorkOrderResponse uploadPhoto(AppUser actor, Long id, String declaredContentType, byte[] bytes) {
        WorkOrder order = requireAssignedTechnicianInProgress(actor, id, "Only technicians can attach a photo");
        String contentType = ImagePayload.detectContentType(declaredContentType, bytes);
        photoStorage.store(order.getId(), bytes);
        order.setPhotoContentType(contentType);
        return WorkOrderResponse.from(order);
    }

    @Transactional(readOnly = true)
    public StoredPhoto loadPhoto(AppUser actor, Long id) {
        WorkOrder order = getDetail(id);
        assertCanView(actor, order);
        if (!order.hasPhoto()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found");
        }
        return new StoredPhoto(order.getPhotoContentType(), photoStorage.load(order.getId()));
    }

    public WorkOrderResponse updateLocation(AppUser actor, Long id, LocationRequest request) {
        WorkOrder order = requireAssignedTechnicianInProgress(actor, id, "Only technicians can set location");
        order.setLocation(request.lat(), request.lng());
        return WorkOrderResponse.from(order);
    }

    private WorkOrder requireAssignedTechnicianInProgress(AppUser actor, Long id, String roleMessage) {
        WorkOrder order = getDetail(id);
        assertCanView(actor, order);
        if (actor.getRole() != UserRole.TECHNICIAN) {
            throw forbidden(roleMessage);
        }
        if (!isAssignedTo(order, actor)) {
            throw forbidden(NOT_ALLOWED_TO_VIEW);
        }
        if (order.getStatus() != WorkOrderStatus.IN_PROGRESS) {
            throw conflict("Photo and location can only be set when the work order is in progress");
        }
        return order;
    }

    private static boolean isAllowedTransition(
            UserRole role,
            WorkOrderStatus current,
            WorkOrderStatus target) {
        return switch (role) {
            case TECHNICIAN -> switch (current) {
                case PENDING -> target == WorkOrderStatus.IN_PROGRESS;
                case IN_PROGRESS -> target == WorkOrderStatus.DONE;
                case DONE -> false;
            };
            case SUPERVISOR -> switch (current) {
                case PENDING -> target == WorkOrderStatus.IN_PROGRESS;
                case DONE -> target == WorkOrderStatus.PENDING;
                case IN_PROGRESS -> false;
            };
        };
    }

    private WorkOrder getDetail(Long id) {
        return workOrderRepository
                .findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Work order not found"));
    }

    private void assertCanView(AppUser actor, WorkOrder order) {
        if (actor.getRole() == UserRole.SUPERVISOR) {
            return;
        }
        AppUser assigned = order.getAssignedTechnician();
        if (assigned != null && !assigned.getId().equals(actor.getId())) {
            throw forbidden(NOT_ALLOWED_TO_VIEW);
        }
    }

    private boolean isAssignedTo(WorkOrder order, AppUser actor) {
        return order.getAssignedTechnician() != null
                && Objects.equals(order.getAssignedTechnician().getId(), actor.getId());
    }

    private AppUser resolveAssignableTechnician(Long technicianId) {
        if (technicianId == null) {
            return null;
        }
        AppUser user = userRepository
                .findById(technicianId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Technician not found"));
        if (user.getRole() != UserRole.TECHNICIAN) {
            throw badRequest("Must be a technician");
        }
        return user;
    }

    private static void requireSupervisor(AppUser actor, String message) {
        if (actor.getRole() != UserRole.SUPERVISOR) {
            throw forbidden(message);
        }
    }

    private static ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
