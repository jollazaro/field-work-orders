/** Maps known API English messages to Spanish for toasts; otherwise returns as-is. */
const MESSAGE_ES: Record<string, string> = {
  'Not allowed to view this work order': 'No tenés permiso para ver esta orden',
  'Assign a technician first': 'Asigná un técnico primero',
  'Photo is required before completing': 'Adjuntá una foto antes de completar la orden',
  'Work order must be pending to change assignment':
    'Solo se puede asignar mientras la orden esté pendiente',
  'Work order already assigned': 'La orden ya está asignada',
  'Not allowed to assign this technician': 'No podés asignar ese técnico',
  'Work order is already in that status': 'La orden ya está en ese estado',
  'Illegal status transition': 'Transición de estado no permitida',
  'Only supervisors can create work orders': 'Solo el supervisor puede crear órdenes',
  'Only technicians can attach a photo': 'Solo el técnico puede adjuntar foto',
  'Only technicians can set location': 'Solo el técnico puede fijar la ubicación',
  'Photo and location can only be set when the work order is in progress':
    'Foto y ubicación solo en una orden en curso',
  'technicianId is required': 'Elegí un técnico',
  'Must be a technician': 'Debés ser técnico',
  'Work order not found': 'Orden no encontrada',
  'Technician not found': 'Técnico no encontrado',
  'File must be an image': 'El archivo debe ser una imagen',
  'title is required (max 200)': 'El título es obligatorio (máx. 200)',
  'site is required (max 200)': 'La ubicación es obligatoria (máx. 200)',
  'lat and lng must both be provided': 'Marcá latitud y longitud juntos en el mapa',
  'lat and lng are required': 'Marcá el pin en el mapa antes de crear la orden',
  'Address not found': 'No encontramos esa dirección. Probá con más detalle o tocá el mapa.',
  'Query is required': 'Escribí una dirección para buscar.',
  'Geocode failed': 'No se pudo buscar la dirección. Reintentá en unos segundos.',
  'instruction is required (max 2000)': 'La instrucción es obligatoria (máx. 2000)',
  'priority is required': 'La prioridad es obligatoria',
  'Invalid credentials': 'Email o clave incorrectos',
  Unauthorized: 'Sesión inválida o expirada',
  Forbidden: 'No tenés permiso para esta acción',
};

export function userFacingMessage(message: string): string {
  return MESSAGE_ES[message] ?? message;
}
