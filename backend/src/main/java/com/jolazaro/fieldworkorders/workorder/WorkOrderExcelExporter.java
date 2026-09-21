package com.jolazaro.fieldworkorders.workorder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Builds an .xlsx workbook for work-order list export (operator-facing Spanish headers).
 */
final class WorkOrderExcelExporter {

    private static final DateTimeFormatter INSTANT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneOffset.UTC);

    private WorkOrderExcelExporter() {
    }

    static byte[] toXlsx(List<WorkOrder> orders) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Ordenes");
            Row header = sheet.createRow(0);
            String[] columns = {
                "Id",
                "Titulo",
                "Ubicacion",
                "Instruccion",
                "Estado",
                "Prioridad",
                "Tecnico",
                "Lat",
                "Lng",
                "Creada",
                "Actualizada"
            };
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }

            int rowIdx = 1;
            for (WorkOrder order : orders) {
                Row row = sheet.createRow(rowIdx++);
                var tech = order.getAssignedTechnician();
                row.createCell(0).setCellValue(order.getId() == null ? 0 : order.getId());
                row.createCell(1).setCellValue(nullToEmpty(order.getTitle()));
                row.createCell(2).setCellValue(nullToEmpty(order.getSite()));
                row.createCell(3).setCellValue(nullToEmpty(order.getInstruction()));
                row.createCell(4).setCellValue(statusLabel(order));
                row.createCell(5).setCellValue(priorityLabel(order.getPriority()));
                row.createCell(6).setCellValue(tech == null ? "Sin asignar" : nullToEmpty(tech.getEmail()));
                if (order.getLat() != null) {
                    row.createCell(7).setCellValue(order.getLat());
                } else {
                    row.createCell(7).setCellValue("");
                }
                if (order.getLng() != null) {
                    row.createCell(8).setCellValue(order.getLng());
                } else {
                    row.createCell(8).setCellValue("");
                }
                row.createCell(9).setCellValue(order.getCreatedAt() == null ? "" : INSTANT.format(order.getCreatedAt()));
                row.createCell(10)
                        .setCellValue(order.getUpdatedAt() == null ? "" : INSTANT.format(order.getUpdatedAt()));
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to build work-order Excel export", ex);
        }
    }

    private static String statusLabel(WorkOrder order) {
        if (order.getStatus() == WorkOrderStatus.PENDING && order.getAssignedTechnician() == null) {
            return "Sin asignar";
        }
        return switch (order.getStatus()) {
            case PENDING -> "Pendiente";
            case IN_PROGRESS -> "En curso";
            case DONE -> "Completada";
        };
    }

    private static String priorityLabel(WorkOrderPriority priority) {
        if (priority == null) {
            return "";
        }
        return switch (priority) {
            case NORMAL -> "Normal";
            case HIGH -> "Urgente";
        };
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
