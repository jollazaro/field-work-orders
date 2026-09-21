import { statusDisplayLabel, PRIORITY_LABELS } from '../domain/labels';
import type { WorkOrder } from '../domain/models/work-order';

/** Builds a SpreadsheetML .xls blob that Excel opens (used by the demo adapter). */
export function buildWorkOrdersSpreadsheetMl(orders: WorkOrder[]): Blob {
  const header = [
    'Id',
    'Titulo',
    'Ubicacion',
    'Instruccion',
    'Estado',
    'Prioridad',
    'Tecnico',
    'Lat',
    'Lng',
    'Creada',
    'Actualizada',
  ];
  const rows = orders.map((order) => [
    String(order.id),
    order.title,
    order.site,
    order.instruction,
    statusDisplayLabel(order.status, order.assignedTechnicianId),
    PRIORITY_LABELS[order.priority],
    order.assignedTechnicianEmail ?? 'Sin asignar',
    order.lat == null ? '' : String(order.lat),
    order.lng == null ? '' : String(order.lng),
    order.createdAt,
    order.updatedAt,
  ]);

  const xmlRows = [header, ...rows]
    .map(
      (cells) =>
        `<Row>${cells
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
          .join('')}</Row>`,
    )
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Ordenes">
  <Table>${xmlRows}</Table>
 </Worksheet>
</Workbook>`;

  return new Blob([xml], { type: 'application/vnd.ms-excel' });
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
