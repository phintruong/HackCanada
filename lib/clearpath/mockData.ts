import { Hospital, CongestionSnapshot } from './types';

export const mockHospitals: Hospital[] = [
  {
    id: 'tgh',
    name: 'Toronto General Hospital',
    city: 'toronto',
    latitude: 43.6592,
    longitude: -79.3882,
    totalBeds: 471,
    erBeds: 60,
    phone: '416-340-4800',
    website: 'https://www.uhn.ca',
    specialties: ['cardiac', 'transplant', 'respiratory']
  },
  {
    id: 'stmichaels',
    name: "St. Michael's Hospital",
    city: 'toronto',
    latitude: 43.6537,
    longitude: -79.3777,
    totalBeds: 463,
    erBeds: 55,
    phone: '416-360-4000',
    website: 'https://unityhealth.to',
    specialties: ['trauma', 'neurology', 'cardiac']
  },
  {
    id: 'sunnybrook',
    name: 'Sunnybrook Health Sciences Centre',
    city: 'toronto',
    latitude: 43.7224,
    longitude: -79.3725,
    totalBeds: 1325,
    erBeds: 72,
    phone: '416-480-6100',
    website: 'https://sunnybrook.ca',
    specialties: ['trauma', 'stroke', 'burn']
  },
  {
    id: 'sinai',
    name: 'Mount Sinai Hospital',
    city: 'toronto',
    latitude: 43.6575,
    longitude: -79.3906,
    totalBeds: 442,
    erBeds: 40,
    phone: '416-596-4200',
    website: 'https://www.sinaihealth.ca',
    specialties: ['obstetrics', 'respiratory']
  },
  {
    id: 'western',
    name: 'Toronto Western Hospital',
    city: 'toronto',
    latitude: 43.6536,
    longitude: -79.4054,
    totalBeds: 272,
    erBeds: 45,
    phone: '416-603-2581',
    website: 'https://www.uhn.ca',
    specialties: ['neurology', 'stroke', 'orthopedic']
  },
  {
    id: 'scarborough-general',
    name: 'Scarborough Health Network - General',
    city: 'toronto',
    latitude: 43.7315,
    longitude: -79.2548,
    totalBeds: 620,
    erBeds: 50,
    phone: '416-438-2911',
    website: 'https://www.shn.ca',
    specialties: ['general', 'cardiac']
  },
  {
    id: 'north-york-general',
    name: 'North York General Hospital',
    city: 'toronto',
    latitude: 43.7663,
    longitude: -79.3655,
    totalBeds: 420,
    erBeds: 48,
    phone: '416-756-6000',
    website: 'https://www.nygh.on.ca',
    specialties: ['general', 'respiratory', 'orthopedic']
  },
  {
    id: 'humber-river',
    name: 'Humber River Hospital',
    city: 'toronto',
    latitude: 43.7556,
    longitude: -79.5167,
    totalBeds: 656,
    erBeds: 52,
    phone: '416-747-3400',
    website: 'https://www.hrh.ca',
    specialties: ['general', 'cardiac']
  }
];

export const mockCongestion: CongestionSnapshot[] = mockHospitals.map(h => ({
  hospitalId: h.id,
  occupancyPct: Math.round(Math.random() * 40 + 50),
  waitMinutes: Math.floor(Math.random() * 180 + 60),
  recordedAt: new Date()
}));
