import type { MapHospitalMarker } from './types';

export const MOCK_HOSPITALS: Record<string, MapHospitalMarker[]> = {
  toronto: [
    { id: 'th-1', name: 'Toronto General Hospital', lng: -79.387, lat: 43.662, occupancyPct: 72, waitMinutes: 45 },
    { id: 'th-2', name: 'St. Michael\'s Hospital', lng: -79.378, lat: 43.656, occupancyPct: 85, waitMinutes: 60 },
    { id: 'th-3', name: 'Sunnybrook Health Centre', lng: -79.363, lat: 43.722, occupancyPct: 58, waitMinutes: 30 },
    { id: 'th-4', name: 'Toronto Western Hospital', lng: -79.406, lat: 43.654, occupancyPct: 68, waitMinutes: 40 },
  ],
  kitchener: [
    { id: 'kh-1', name: 'Grand River Hospital', lng: -80.493, lat: 43.448, occupancyPct: 65, waitMinutes: 35 },
    { id: 'kh-2', name: 'St. Mary\'s General Hospital', lng: -80.478, lat: 43.442, occupancyPct: 78, waitMinutes: 50 },
    { id: 'kh-3', name: 'Cambridge Memorial Hospital', lng: -80.312, lat: 43.361, occupancyPct: 55, waitMinutes: 25 },
  ],
  mississauga: [
    { id: 'mh-1', name: 'Trillium Health Partners (Mississauga)', lng: -79.641, lat: 43.549, occupancyPct: 82, waitMinutes: 55 },
    { id: 'mh-2', name: 'Credit Valley Hospital', lng: -79.688, lat: 43.565, occupancyPct: 70, waitMinutes: 42 },
    { id: 'mh-3', name: 'Queensway Health Centre', lng: -79.612, lat: 43.572, occupancyPct: 62, waitMinutes: 32 },
  ],
};

export function getMockHospitalsByCity(cityId: string): MapHospitalMarker[] {
  return MOCK_HOSPITALS[cityId] ?? [];
}
