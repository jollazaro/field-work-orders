package com.jolazaro.fieldworkorders.workorder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.jolazaro.fieldworkorders.user.AppUser;
import com.jolazaro.fieldworkorders.user.UserRepository;

@Component
@Order(2)
public class WorkOrderSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderSeeder.class);

    // 1x1 PNG
    private static final byte[] PLACEHOLDER_PNG = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53,
            (byte) 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, (byte) 0xD7, 0x63, (byte) 0xF8,
            (byte) 0xCF, (byte) 0xC0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, (byte) 0xFE, (byte) 0xD4,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82
    };

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderService workOrderService;
    private final UserRepository userRepository;

    public WorkOrderSeeder(
            WorkOrderRepository workOrderRepository,
            WorkOrderService workOrderService,
            UserRepository userRepository) {
        this.workOrderRepository = workOrderRepository;
        this.workOrderService = workOrderService;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (workOrderRepository.count() > 0) {
            return;
        }

        AppUser supervisor = userRepository.findByEmailIgnoreCase("supervisor@demo.com").orElseThrow();
        AppUser technician = userRepository.findByEmailIgnoreCase("tecnico@demo.com").orElseThrow();

        workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Revision de tablero",
                        "Av. Colon 1200",
                        "Revisar tablero general y reportar fallas visibles.",
                        WorkOrderPriority.HIGH,
                        null));

        WorkOrderResponse inProgress = workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Cambio de medidor",
                        "Bv. San Juan 450",
                        "Reemplazar medidor y dejar foto del numero nuevo.",
                        WorkOrderPriority.NORMAL,
                        technician.getId()));
        workOrderService.changeStatus(supervisor, inProgress.id(), WorkOrderStatus.IN_PROGRESS);
        workOrderService.updateLocation(technician, inProgress.id(), new LocationRequest(-31.4201, -64.1888));

        WorkOrderResponse done = workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Inspeccion de conexion",
                        "Calle 25 de Mayo 80",
                        "Verificar conexion domiciliaria y documentar con foto.",
                        WorkOrderPriority.NORMAL,
                        technician.getId()));
        workOrderService.changeStatus(technician, done.id(), WorkOrderStatus.IN_PROGRESS);
        workOrderService.updateLocation(technician, done.id(), new LocationRequest(-31.4167, -64.1833));
        workOrderService.uploadPhoto(technician, done.id(), "image/png", PLACEHOLDER_PNG);
        workOrderService.changeStatus(technician, done.id(), WorkOrderStatus.DONE);

        log.info("Seeded demo work orders");
    }
}
