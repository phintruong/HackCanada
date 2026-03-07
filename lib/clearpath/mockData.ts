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
  ,
  {
    "id": "odhf-0",
    "name": "Casey House Hospice",
    "city": "toronto",
    "latitude": 43.668867,
    "longitude": -79.37892,
    "totalBeds": 14,
    "erBeds": 0,
    "phone": "416-962-4040",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-1",
    "name": "Centre for Addiction and Mental Health",
    "city": "toronto",
    "latitude": 43.6435848,
    "longitude": -79.41854079999999,
    "totalBeds": 500,
    "erBeds": 30,
    "phone": "416-535-8501",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-2",
    "name": "Centre for Addiction and Mental Health - Brentcliffe Rd. Site",
    "city": "toronto",
    "latitude": 43.7195763,
    "longitude": -79.3662235,
    "totalBeds": 100,
    "erBeds": 0,
    "phone": "416-535-8501",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-3",
    "name": "Centre for Addiction and Mental Health - College St. Site",
    "city": "toronto",
    "latitude": 43.658404600000004,
    "longitude": -79.39896759999999,
    "totalBeds": 100,
    "erBeds": 0,
    "phone": "416-535-8501",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-4",
    "name": "Centre for Addiction and Mental Health - Russell St. Site",
    "city": "toronto",
    "latitude": 43.6597795,
    "longitude": -79.39943149999999,
    "totalBeds": 100,
    "erBeds": 0,
    "phone": "416-535-8501",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-5",
    "name": "Credit Valley Hospital",
    "city": "mississauga",
    "latitude": 43.559349600000004,
    "longitude": -79.7032464,
    "totalBeds": 382,
    "erBeds": 55,
    "phone": "905-813-2200",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-6",
    "name": "Holland Bloorview Kids Rehabilitation Hospital",
    "city": "toronto",
    "latitude": 43.71805689999999,
    "longitude": -79.3741804,
    "totalBeds": 75,
    "erBeds": 0,
    "phone": "416-425-6220",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-7",
    "name": "Hospital for Sick Children",
    "city": "toronto",
    "latitude": 43.657374,
    "longitude": -79.387437,
    "totalBeds": 370,
    "erBeds": 45,
    "phone": "416-813-1500",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-8",
    "name": "Humber River Hospital",
    "city": "toronto",
    "latitude": 43.72377199,
    "longitude": -79.48937432,
    "totalBeds": 722,
    "erBeds": 70,
    "phone": "416-242-1000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-9",
    "name": "Humber River Hospital -York Finch",
    "city": "toronto",
    "latitude": 43.754503,
    "longitude": -79.526393,
    "totalBeds": 300,
    "erBeds": 30,
    "phone": "416-242-1000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-10",
    "name": "Humber River Regional Hospital - Keele Street Site",
    "city": "toronto",
    "latitude": 43.6974651,
    "longitude": -79.47385140000002,
    "totalBeds": 300,
    "erBeds": 30,
    "phone": "416-242-1000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-11",
    "name": "Mount Sinai Hospital",
    "city": "toronto",
    "latitude": 43.6575099,
    "longitude": -79.3902938,
    "totalBeds": 442,
    "erBeds": 40,
    "phone": "416-596-4200",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-12",
    "name": "Sunnybrook Health Sciences Centre - Bayview Campus",
    "city": "toronto",
    "latitude": 43.720661,
    "longitude": -79.378057,
    "totalBeds": 1325,
    "erBeds": 72,
    "phone": "416-480-6100",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-13",
    "name": "Scarborough Health Network - Centenary Hospital",
    "city": "toronto",
    "latitude": 43.7807594,
    "longitude": -79.20502259999999,
    "totalBeds": 350,
    "erBeds": 40,
    "phone": "416-284-8131",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-14",
    "name": "St. John's Rehabilitation Hospital",
    "city": "toronto",
    "latitude": 43.7875454,
    "longitude": -79.40405679999999,
    "totalBeds": 160,
    "erBeds": 0,
    "phone": "416-226-6780",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-15",
    "name": "St. Joseph's Health Centre - Toronto",
    "city": "toronto",
    "latitude": 43.640631,
    "longitude": -79.450314,
    "totalBeds": 376,
    "erBeds": 50,
    "phone": "416-530-6000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-16",
    "name": "St. Michael's Hospital - Bond St. Site",
    "city": "toronto",
    "latitude": 43.65391470000001,
    "longitude": -79.37767059999999,
    "totalBeds": 463,
    "erBeds": 55,
    "phone": "416-360-4000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-17",
    "name": "Sunnybrook Health Sciences Centre",
    "city": "toronto",
    "latitude": 43.6650195,
    "longitude": -79.38233609999999,
    "totalBeds": 1325,
    "erBeds": 112,
    "phone": "416-480-6100",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-18",
    "name": "Sunnybrook Health Sciences Centre - Women's College Hospital",
    "city": "toronto",
    "latitude": 43.66171,
    "longitude": -79.387745,
    "totalBeds": 150,
    "erBeds": 46,
    "phone": "416-323-6400",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-19",
    "name": "Toronto East General Hospital",
    "city": "toronto",
    "latitude": 43.6897586,
    "longitude": -79.3259225,
    "totalBeds": 400,
    "erBeds": 50,
    "phone": "416-461-8272",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-20",
    "name": "Toronto Rehabilitation Institute - e. w. Bickle Centre",
    "city": "toronto",
    "latitude": 43.634803399999996,
    "longitude": -79.43270940000001,
    "totalBeds": 200,
    "erBeds": 43,
    "phone": "416-597-3422",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-21",
    "name": "Toronto Rehabilitation Institute - Hillcrest Centre",
    "city": "toronto",
    "latitude": 43.677546500000005,
    "longitude": -79.4155915,
    "totalBeds": 150,
    "erBeds": 42,
    "phone": "416-597-3422",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-22",
    "name": "Toronto Rehabilitation Institute - Lyndhurst Centre",
    "city": "toronto",
    "latitude": 43.718489399999996,
    "longitude": -79.36971159999999,
    "totalBeds": 100,
    "erBeds": 30,
    "phone": "416-597-3422",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-23",
    "name": "Toronto Rehabilitation Institute - Rumsey Centre",
    "city": "toronto",
    "latitude": 43.718728600000006,
    "longitude": -79.3715512,
    "totalBeds": 100,
    "erBeds": 32,
    "phone": "416-597-3422",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-24",
    "name": "Toronto Rehabilitation Institute - University Centre",
    "city": "toronto",
    "latitude": 43.656710700000005,
    "longitude": -79.3899079,
    "totalBeds": 250,
    "erBeds": 37,
    "phone": "416-597-3422",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-25",
    "name": "Trillium Health Partners � Mississauga Hospital",
    "city": "mississauga",
    "latitude": 43.571585999999996,
    "longitude": -79.607685,
    "totalBeds": 278,
    "erBeds": 47,
    "phone": "416-247-1470",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-26",
    "name": "University Health Network - Princess Margaret Hospital",
    "city": "toronto",
    "latitude": 43.658074299999996,
    "longitude": -79.3905974,
    "totalBeds": 130,
    "erBeds": 41,
    "phone": "416-946-2000",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-27",
    "name": "University Health Network - Toronto General Hospital",
    "city": "toronto",
    "latitude": 43.659111100000004,
    "longitude": -79.38820940000001,
    "totalBeds": 471,
    "erBeds": 60,
    "phone": "416-340-4800",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-28",
    "name": "University Health Network - Toronto Western Hospital",
    "city": "toronto",
    "latitude": 43.6537025,
    "longitude": -79.4060937,
    "totalBeds": 272,
    "erBeds": 45,
    "phone": "416-603-2581",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  },
  {
    "id": "odhf-29",
    "name": "West Park Healthcare Centre",
    "city": "toronto",
    "latitude": 43.690044,
    "longitude": -79.50818129999999,
    "totalBeds": 300,
    "erBeds": 46,
    "phone": "416-243-3600",
    "website": "https://ontario.ca",
    "specialties": [
      "General"
    ]
  }
];

export const mockCongestion: CongestionSnapshot[] = mockHospitals.map(h => ({
  hospitalId: h.id,
  occupancyPct: Math.round(Math.random() * 40 + 50),
  waitMinutes: Math.floor(Math.random() * 180 + 60),
  recordedAt: new Date()
}));
