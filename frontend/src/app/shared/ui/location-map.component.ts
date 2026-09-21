import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { ThemeService } from '../../core/theme/theme.service';

/** Greater Buenos Aires (pilot area) when no pin is set. */
const DEFAULT_CENTER: L.LatLngExpression = [-34.6037, -58.3816];
const DEFAULT_ZOOM = 12;

const OSM_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

export interface MapLatLng {
  lat: number;
  lng: number;
}

/**
 * Leaflet + free OSM tiles. When `editable`, click sets the pin.
 * Dark theme dims tiles with CSS (no paid tile API).
 */
@Component({
  selector: 'app-location-map',
  template: `<div
    #mapHost
    class="map-host"
    [class.map-host--dark]="theme.isDark()"
    role="img"
    [attr.aria-label]="ariaLabel()"
  ></div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .map-host {
      width: 100%;
      height: 240px;
      border-radius: 8px;
      overflow: hidden;
      background: var(--ion-color-light);
    }
    .map-host--dark {
      filter: brightness(0.82) contrast(1.05) saturate(0.85);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapComponent implements OnDestroy {
  readonly theme = inject(ThemeService);
  private readonly mapHost = viewChild.required<ElementRef<HTMLDivElement>>('mapHost');

  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  readonly editable = input(false);
  readonly ariaLabel = input('Mapa de ubicación');

  readonly locationPicked = output<MapLatLng>();

  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private marker: L.CircleMarker | null = null;
  private clickHandler: ((e: L.LeafletMouseEvent) => void) | null = null;

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (this.map) {
        this.syncMarker(lat, lng);
      }
    });

    effect(() => {
      const editable = this.editable();
      if (this.map) {
        this.syncClickHandler(editable);
      }
    });
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    const host = this.mapHost().nativeElement;
    const lat = this.lat();
    const lng = this.lng();
    const hasPin = lat != null && lng != null;

    this.map = L.map(host, {
      zoomControl: true,
      attributionControl: true,
    }).setView(hasPin ? [lat, lng] : DEFAULT_CENTER, DEFAULT_ZOOM);

    this.tileLayer = L.tileLayer(OSM_TILES.url, {
      attribution: OSM_TILES.attribution,
      maxZoom: 19,
    }).addTo(this.map);
    this.syncMarker(lat, lng);
    this.syncClickHandler(this.editable());

    // Leaflet needs a layout pass when inside Ionic content.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private syncMarker(lat: number | null, lng: number | null): void {
    if (!this.map) {
      return;
    }
    if (lat == null || lng == null) {
      if (this.marker) {
        this.map.removeLayer(this.marker);
        this.marker = null;
      }
      return;
    }

    if (!this.marker) {
      this.marker = L.circleMarker([lat, lng], {
        radius: 10,
        color: '#1D4ED8',
        fillColor: '#1D4ED8',
        fillOpacity: 0.85,
        weight: 2,
      }).addTo(this.map);
    } else {
      this.marker.setLatLng([lat, lng]);
    }
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 15));
  }

  private syncClickHandler(editable: boolean): void {
    if (!this.map) {
      return;
    }
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
      this.clickHandler = null;
    }
    if (!editable) {
      return;
    }
    this.clickHandler = (e: L.LeafletMouseEvent) => {
      const point = { lat: e.latlng.lat, lng: e.latlng.lng };
      this.syncMarker(point.lat, point.lng);
      this.locationPicked.emit(point);
    };
    this.map.on('click', this.clickHandler);
  }

  private teardown(): void {
    if (this.map && this.clickHandler) {
      this.map.off('click', this.clickHandler);
    }
    this.map?.remove();
    this.map = null;
    this.tileLayer = null;
    this.marker = null;
    this.clickHandler = null;
  }
}
