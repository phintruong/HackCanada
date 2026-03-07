export interface CityConfig {
  id: string;
  name: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapHospitalMarker {
  id: string;
  name: string;
  lng: number;
  lat: number;
  occupancyPct?: number;
  waitMinutes?: number;
}
