import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiError } from '../../domain/api-error';
import { throwAsApiError } from '../../data/http/http-api-error';

export interface GeocodeHit {
  lat: number;
  lng: number;
  displayName: string;
}

/** OSM often omits route numbers: "avenida 125 eva peron" → "avenida eva peron". */
const ROUTE_NUMBER = /\b(av\.?|avenida)\s+\d+\s*[-–]?\s*/gi;

@Injectable({ providedIn: 'root' })
export class GeocodeService {
  private readonly http = inject(HttpClient);

  async lookup(query: string): Promise<GeocodeHit> {
    const q = query.trim();
    if (!q) {
      throw new ApiError(400, 'Query is required');
    }

    if (environment.apiBaseUrl) {
      try {
        const params = new HttpParams().set('q', q);
        const hit = await firstValueFrom(
          this.http.get<{ lat: number; lng: number; displayName: string }>(
            `${environment.apiBaseUrl}/api/geocode`,
            { params },
          ),
        );
        return { lat: hit.lat, lng: hit.lng, displayName: hit.displayName };
      } catch (err) {
        throwAsApiError(err);
      }
    }

    // Demo (no API): Nominatim from the browser — low volume only.
    for (const candidate of this.candidates(q)) {
      const hit = await this.searchNominatim(candidate);
      if (hit) {
        return hit;
      }
    }
    throw new ApiError(404, 'Address not found');
  }

  private candidates(q: string): string[] {
    const cleaned = q.replace(ROUTE_NUMBER, '$1 ').replace(/\s{2,}/g, ' ').trim();
    return cleaned.toLowerCase() === q.toLowerCase() ? [q] : [q, cleaned];
  }

  private async searchNominatim(q: string): Promise<GeocodeHit | null> {
    const url =
      'https://nominatim.openstreetmap.org/search?' +
      new URLSearchParams({
        format: 'json',
        limit: '1',
        countrycodes: 'ar',
        q,
      }).toString();
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new ApiError(res.status, 'Geocode failed');
    }
    const body = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!body.length) {
      return null;
    }
    return {
      lat: Number(body[0].lat),
      lng: Number(body[0].lon),
      displayName: body[0].display_name,
    };
  }
}
