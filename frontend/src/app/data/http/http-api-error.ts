import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../../domain/api-error';

/** Maps Angular HTTP failures to the portable {@link ApiError} shape. */
export function throwAsApiError(err: unknown): never {
  if (err instanceof ApiError) {
    throw err;
  }
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { message?: string } | string | null;
    let message = err.message || 'Request failed';
    if (typeof body === 'string' && body.trim()) {
      try {
        const parsed = JSON.parse(body) as { message?: string };
        message = parsed.message ?? body;
      } catch {
        message = body;
      }
    } else if (body && typeof body === 'object' && typeof body.message === 'string') {
      message = body.message;
    }
    throw new ApiError(err.status || 0, message);
  }
  throw new ApiError(0, 'No se pudo completar la acción. Probá de nuevo.');
}
