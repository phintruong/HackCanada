export type ClearPathScenario = 'normal' | 'flu_season' | 'weekend_surge' | 'mass_casualty';

export interface Hospital {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  totalBeds: number;
  erBeds: number;
  phone?: string;
  website?: string;
}

export interface CongestionSnapshot {
  hospitalId: string;
  occupancyPct: number;
  waitMinutes: number;
  recordedAt: Date;
}

export interface SimulateRequest {
  city: string;
  proposedLat: number;
  proposedLng: number;
  proposedCapacity: number;
  scenario?: ClearPathScenario;
}

export interface SimulateResult {
  before: Record<string, number>;
  after: Record<string, number>;
  delta: Record<string, number>;
}

export interface VitalsPayload {
  heartRate: number;
  respiratoryRate: number;
  stressIndex: number;
  emotionState?: string;
}

export interface SymptomsPayload {
  chestPain: boolean;
  shortnessOfBreath: boolean;
  fever: boolean;
  feverDays?: number;
  dizziness: boolean;
  freeText?: string;
}

export interface TriageRequest {
  vitals: VitalsPayload;
  symptoms: SymptomsPayload;
  city: string;
}

export interface TriageResponse {
  severity: 'critical' | 'urgent' | 'non-urgent';
  reasoning: string;
}

export interface RouteRequest {
  userLat: number;
  userLng: number;
  severity: 'critical' | 'urgent' | 'non-urgent';
  city: string;
}

export interface RouteResponse {
  hospital: Hospital;
  distanceKm: number;
  waitMinutes: number;
  reason: string;
}
