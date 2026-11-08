/**
 * Validador de punto en polígono (Ray-casting Algorithm)
 * Utilizado para verificar si la coordenada del cliente cae dentro de una Zona de Envío de Google Maps.
 */
export interface Point {
  lat: number;
  lng: number;
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findMatchingDeliveryZone<T extends {
  id?: string;
  name: string;
  deliveryFee: number;
  polygonGeoJson: Point[] | string;
  estimatedMin: number;
  estimatedMax: number;
}>(point: Point, zones: T[]): (T & { polygonGeoJson: Point[] }) | null {
  for (const zone of zones) {
    let polygonPoints: Point[] = [];
    if (typeof zone.polygonGeoJson === 'string') {
      try {
        polygonPoints = JSON.parse(zone.polygonGeoJson);
      } catch {
        polygonPoints = [];
      }
    } else {
      polygonPoints = zone.polygonGeoJson;
    }

    if (isPointInPolygon(point, polygonPoints)) {
      return {
        ...zone,
        polygonGeoJson: polygonPoints,
      };
    }
  }
  return null;
}
