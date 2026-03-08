export interface ProposedBuilding {
  id: string;
  lat: number;
  lng: number;
  rotation: number;
  blueprint: Blueprint;
}

export interface BlueprintMetadata {
  erBeds: number;
  operatingRooms: number;
  traumaRooms: number;
  ambulances: number;
  rooms: number;
  doctors: number;
  nurses: number;
  numberOfFloors: number;
  totalFloorArea: number;
  groundFloorArea: number;
}

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  glbPath: string;
  beds: number;
  /** Minimum parcel area in m² for this blueprint to fit */
  minAreaM2: number;
  /** Detailed hospital metadata from the editor */
  metadata?: BlueprintMetadata;
}

export const PRESET_BLUEPRINTS: Blueprint[] = [
  {
    id: 'small-er',
    name: 'Small ER Clinic',
    description: '50-bed emergency clinic',
    glbPath: '/map-data/blueprints/small-er.glb',
    beds: 50,
    minAreaM2: 100,
  },
  {
    id: 'medium-hospital',
    name: 'Medium Hospital',
    description: '150-bed regional hospital',
    glbPath: '/map-data/blueprints/medium-hospital.glb',
    beds: 150,
    minAreaM2: 400,
  },
  {
    id: 'large-complex',
    name: 'Large Medical Complex',
    description: '400-bed full-service hospital',
    glbPath: '/map-data/blueprints/large-complex.glb',
    beds: 400,
    minAreaM2: 800,
  },
];

/** Build a Blueprint from an exported building returned by the editor API. */
export function createBlueprintFromBuilding(building: {
  id: string;
  name: string;
  beds: number;
  publicPath: string;
  metadata?: {
    groundFloorArea?: number;
    erBeds?: number;
    operatingRooms?: number;
    traumaRooms?: number;
    ambulances?: number;
    rooms?: number;
    doctors?: number;
    nurses?: number;
    numberOfFloors?: number;
    totalFloorArea?: number;
    totalBeds?: number;
  } | null;
}): Blueprint {
  const m = building.metadata;
  return {
    id: `custom-${building.id}`,
    name: building.name || 'Custom Building',
    description: `${building.beds}-bed custom design`,
    glbPath: building.publicPath,
    beds: building.beds,
    minAreaM2: m?.groundFloorArea ?? 100,
    metadata: m ? {
      erBeds: m.erBeds ?? 0,
      operatingRooms: m.operatingRooms ?? 0,
      traumaRooms: m.traumaRooms ?? 0,
      ambulances: m.ambulances ?? 0,
      rooms: m.rooms ?? 0,
      doctors: m.doctors ?? 0,
      nurses: m.nurses ?? 0,
      numberOfFloors: m.numberOfFloors ?? 1,
      totalFloorArea: m.totalFloorArea ?? 0,
      groundFloorArea: m.groundFloorArea ?? 0,
    } : undefined,
  };
}

