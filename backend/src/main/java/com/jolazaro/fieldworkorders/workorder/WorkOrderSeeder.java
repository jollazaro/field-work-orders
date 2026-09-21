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
    private static final int TARGET_COUNT = 50;

    // 1x1 PNG
    private static final byte[] PLACEHOLDER_PNG = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53,
            (byte) 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, (byte) 0xD7, 0x63, (byte) 0xF8,
            (byte) 0xCF, (byte) 0xC0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, (byte) 0xFE, (byte) 0xD4,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82
    };

    private static final String[] TITLES = {
            "Revisión de tablero",
            "Cambio de medidor",
            "Inspección de conexión",
            "Reparación de luminaria",
            "Verificación de tensión",
            "Instalación de interruptor",
            "Control de transformador",
            "Relevamiento de acometida",
            "Mantenimiento de caja",
            "Prueba de diferencial"
    };

    private static final String[] SITES = {
            "Av. Colón 1200",
            "Bv. San Juan 450",
            "Calle 25 de Mayo 80",
            "Av. Rafael Núñez 2100",
            "Calle Obispo Trejo 55",
            "Av. Fuerza Aérea 800",
            "Calle Dean Funes 300",
            "Av. Vélez Sársfield 1500",
            "Calle Ituzaingó 90",
            "Av. Circunvalación km 4"
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
        long existing = workOrderRepository.count();
        if (existing >= TARGET_COUNT) {
            return;
        }

        AppUser supervisor = userRepository.findByEmailIgnoreCase("supervisor@demo.com").orElseThrow();
        AppUser technician = userRepository.findByEmailIgnoreCase("tecnico@demo.com").orElseThrow();

        if (existing == 0) {
            seedShowcaseOrders(supervisor, technician);
        }

        int nextIndex = (int) workOrderRepository.count() + 1;
        while (workOrderRepository.count() < TARGET_COUNT) {
            seedBulkOrder(supervisor, technician, nextIndex++);
        }

        log.info("Seeded demo work orders (total={})", workOrderRepository.count());
    }

    private void seedShowcaseOrders(AppUser supervisor, AppUser technician) {
        workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Revision de tablero",
                        "Av. Colon 1200",
                        "Revisar tablero general y reportar fallas visibles.",
                        WorkOrderPriority.HIGH,
                        null,
                        -34.6037,
                        -58.3816));

        WorkOrderResponse inProgress = workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Cambio de medidor",
                        "Bv. San Juan 450",
                        "Reemplazar medidor y dejar foto del numero nuevo.",
                        WorkOrderPriority.NORMAL,
                        technician.getId(),
                        -34.6050,
                        -58.3900));
        workOrderService.changeStatus(supervisor, inProgress.id(), WorkOrderStatus.IN_PROGRESS);
        workOrderService.updateLocation(technician, inProgress.id(), new LocationRequest(-34.6050, -58.3900));

        WorkOrderResponse done = workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        "Inspeccion de conexion",
                        "Calle 25 de Mayo 80",
                        "Verificar conexion domiciliaria y documentar con foto.",
                        WorkOrderPriority.NORMAL,
                        technician.getId(),
                        -34.6100,
                        -58.3850));
        workOrderService.changeStatus(technician, done.id(), WorkOrderStatus.IN_PROGRESS);
        workOrderService.updateLocation(technician, done.id(), new LocationRequest(-34.6100, -58.3850));
        workOrderService.uploadPhoto(technician, done.id(), "image/png", PLACEHOLDER_PNG);
        workOrderService.changeStatus(technician, done.id(), WorkOrderStatus.DONE);
    }

    private void seedBulkOrder(AppUser supervisor, AppUser technician, int index) {
        String title = TITLES[index % TITLES.length] + " #" + index;
        String site = SITES[index % SITES.length];
        String instruction = "Orden de demo #" + index + " para paginación y búsqueda.";
        WorkOrderPriority priority = index % 5 == 0 ? WorkOrderPriority.HIGH : WorkOrderPriority.NORMAL;
        boolean assign = index % 3 != 0;
        double lat = -34.55 - (index % 20) * 0.01;
        double lng = -58.40 - (index % 15) * 0.01;

        WorkOrderResponse created = workOrderService.create(
                supervisor,
                new CreateWorkOrderRequest(
                        title,
                        site,
                        instruction,
                        priority,
                        assign ? technician.getId() : null,
                        lat,
                        lng));

        int lane = index % 4;
        if (lane == 1 && assign) {
            workOrderService.changeStatus(supervisor, created.id(), WorkOrderStatus.IN_PROGRESS);
        } else if (lane == 2 && assign) {
            workOrderService.changeStatus(technician, created.id(), WorkOrderStatus.IN_PROGRESS);
            workOrderService.uploadPhoto(technician, created.id(), "image/png", PLACEHOLDER_PNG);
            workOrderService.changeStatus(technician, created.id(), WorkOrderStatus.DONE);
        }
    }
}
