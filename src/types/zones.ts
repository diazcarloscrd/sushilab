export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface DeliveryZoneItem {
  id?: string;
  name: string;
  polygonGeoJson: LatLngPoint[];
  deliveryFee: number;
  minOrderAmount: number;
  estimatedMin: number;
  estimatedMax: number;
  isActive: boolean;
  colorHex?: string;
}
