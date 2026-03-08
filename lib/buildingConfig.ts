export interface BuildingConfig {
  floors: number;
  width: number;
  length: number;
  heightPerFloor: number;
  wallColor: string;
  windowStyle: 'none' | 'basic' | 'glass' | 'arched' | 'circular' | 'triangular';
  texture: 'smooth' | 'concrete' | 'brick' | 'wood' | 'glass';
  roofStyle: 'flat' | 'gable' | 'hip';
  style: 'modern' | 'classic' | 'industrial';
  notes?: string;

  // Hospital parameters
  hospitalBeds?: number;
  hospitalDoctors?: number;
  hospitalNurses?: number;
  hospitalRooms?: number;
  hospitalOperatingRooms?: number;
  hospitalEmergencyBays?: number;
  hospitalAmbulances?: number;
  hospitalTraumaRooms?: number;
  hospitalFloors?: number;
}

export const defaultBuildingConfig: BuildingConfig = {
  floors: 3,
  width: 20,
  length: 15,
  heightPerFloor: 3.5,
  wallColor: 'gray',
  windowStyle: 'basic',
  texture: 'concrete',
  roofStyle: 'flat',
  style: 'modern',
};
