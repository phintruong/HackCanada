import type { BuildingSpecification } from '@/lib/editor/types/buildingSpec';

export type RoomTypeId =
  | 'patient_room'
  | 'operating_room'
  | 'emergency_bay'
  | 'trauma_room'
  | 'ambulance_bay';

export interface FurnitureTemplate {
  label: string;
  relativeX: number;
  relativeZ: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export interface RoomTypeDefinition {
  id: RoomTypeId;
  label: string;
  shortLabel: string;
  description: string;
  unitWidth: number;
  unitDepth: number;
  floorColor: string;
  wallColor: string;
  priority: number;         // lower = placed first on each floor
  groundFloorOnly: boolean; // if true, only placed on floor 0
  furniture: FurnitureTemplate[];
  getCount: (spec: BuildingSpecification) => number;
}

export const ROOM_TYPES: RoomTypeDefinition[] = [
  {
    id: 'ambulance_bay',
    label: 'Ambulance Bays',
    shortLabel: 'Amb',
    description: 'Ground-floor vehicle bays for emergency transport',
    unitWidth: 3.6,
    unitDepth: 7.6,
    floorColor: '#f5f5f4',
    wallColor: '#a8a29e',
    priority: 0,
    groundFloorOnly: true,
    furniture: [
      { label: 'Ambulance', relativeX: 0.7, relativeZ: 1.0, width: 2.2, depth: 5.5, height: 0.4, color: '#ef4444' },
      { label: 'Supply Station', relativeX: 0.2, relativeZ: 0.2, width: 0.5, depth: 0.5, height: 0.8, color: '#a78bfa' },
    ],
    getCount: (spec) => spec.hospitalAmbulances ?? 0,
  },
  {
    id: 'emergency_bay',
    label: 'Emergency Bays',
    shortLabel: 'ER',
    description: 'ED treatment stations with stretcher and monitoring',
    unitWidth: 3.5,
    unitDepth: 4,
    floorColor: '#fef2f2',
    wallColor: '#9ca3af',
    priority: 1,
    groundFloorOnly: true,
    furniture: [
      { label: 'Stretcher', relativeX: 1.0, relativeZ: 1.0, width: 0.7, depth: 2.0, height: 0.6, color: '#ef4444' },
      { label: 'Monitor', relativeX: 0.15, relativeZ: 0.15, width: 0.3, depth: 0.3, height: 1.2, color: '#34d399' },
      { label: 'Supply Cabinet', relativeX: 2.8, relativeZ: 3.3, width: 0.5, depth: 0.4, height: 0.9, color: '#a78bfa' },
    ],
    getCount: (spec) => spec.hospitalEmergencyBays ?? 0,
  },
  {
    id: 'trauma_room',
    label: 'Trauma Rooms',
    shortLabel: 'Trauma',
    description: 'Critical care rooms with full monitoring and equipment',
    unitWidth: 5,
    unitDepth: 6,
    floorColor: '#fff7ed',
    wallColor: '#78716c',
    priority: 2,
    groundFloorOnly: true,
    furniture: [
      { label: 'Trauma Bed', relativeX: 2.0, relativeZ: 2.0, width: 0.9, depth: 2.1, height: 0.6, color: '#dc2626' },
      { label: 'Equipment Cart', relativeX: 0.3, relativeZ: 0.5, width: 0.5, depth: 0.6, height: 0.8, color: '#8b5cf6' },
      { label: 'Equipment Cart', relativeX: 4.2, relativeZ: 0.5, width: 0.5, depth: 0.6, height: 0.8, color: '#8b5cf6' },
      { label: 'Monitor Bank', relativeX: 1.8, relativeZ: 5.2, width: 1.0, depth: 0.3, height: 1.2, color: '#34d399' },
      { label: 'Sink', relativeX: 4.2, relativeZ: 5.2, width: 0.5, depth: 0.4, height: 0.8, color: '#67e8f9' },
    ],
    getCount: (spec) => spec.hospitalTraumaRooms ?? 0,
  },
  {
    id: 'operating_room',
    label: 'Operating Rooms',
    shortLabel: 'OR',
    description: 'Surgical suites with operating table and equipment',
    unitWidth: 7,
    unitDepth: 7,
    floorColor: '#ecfdf5',
    wallColor: '#6b7280',
    priority: 3,
    groundFloorOnly: false,
    furniture: [
      { label: 'Operating Table', relativeX: 3.0, relativeZ: 3.0, width: 0.7, depth: 2.0, height: 0.9, color: '#3b82f6' },
      { label: 'Equipment Cart', relativeX: 0.5, relativeZ: 1.0, width: 0.6, depth: 0.8, height: 0.8, color: '#8b5cf6' },
      { label: 'Instrument Table', relativeX: 5.5, relativeZ: 3.5, width: 0.5, depth: 1.2, height: 0.8, color: '#6366f1' },
      { label: 'Anesthesia Station', relativeX: 1.0, relativeZ: 5.5, width: 0.7, depth: 0.7, height: 1.0, color: '#f97316' },
      { label: 'Overhead Light', relativeX: 3.0, relativeZ: 2.8, width: 0.8, depth: 0.8, height: 0.1, color: '#fde047' },
    ],
    getCount: (spec) => spec.hospitalOperatingRooms ?? 0,
  },
  {
    id: 'patient_room',
    label: 'Patient Rooms',
    shortLabel: 'Patient',
    description: 'Standard inpatient rooms with bed and monitoring',
    unitWidth: 5,
    unitDepth: 6,
    floorColor: '#f0f4f8',
    wallColor: '#94a3b8',
    priority: 4,
    groundFloorOnly: false,
    furniture: [
      { label: 'Bed', relativeX: 1.0, relativeZ: 2.0, width: 1.0, depth: 2.1, height: 0.6, color: '#60a5fa' },
      { label: 'Cabinet', relativeX: 0.2, relativeZ: 2.0, width: 0.5, depth: 0.5, height: 0.8, color: '#a78bfa' },
      { label: 'Chair', relativeX: 3.5, relativeZ: 4.5, width: 0.6, depth: 0.6, height: 0.5, color: '#fbbf24' },
      { label: 'Monitor', relativeX: 0.2, relativeZ: 3.8, width: 0.3, depth: 0.3, height: 1.2, color: '#34d399' },
    ],
    getCount: (spec) => spec.hospitalRooms ?? 0,
  },
];
