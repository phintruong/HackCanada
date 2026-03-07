import { BuildingInstance } from '@/lib/editor/types/buildingSpec';

// Staffing ratio constants (same as HospitalForm)
const NURSE_PER_INPATIENT_BEDS = 4.5;
const DOCTOR_PER_INPATIENT_BEDS = 18;
const NURSES_PER_OR = 2.5;
const NURSE_PER_ED_BAYS = 3;
const DOCTOR_PER_ED_BAYS = 10;

export interface HospitalMetadata {
  // Raw capacity
  totalBeds: number;
  erBeds: number;
  operatingRooms: number;
  traumaRooms: number;
  ambulances: number;
  rooms: number;

  // Staffing
  doctors: number;
  nurses: number;

  // Computed effective capacity
  usableInpatientBeds: number;
  usableERBays: number;
  usableORs: number;

  // Physical
  totalFloorArea: number;
  groundFloorArea: number;
  numberOfFloors: number;

  createdAt: string;
}

/**
 * Extract hospital metadata from all buildings in the editor.
 * Aggregates capacity across all buildings in the design.
 */
export function extractHospitalMetadata(buildings: BuildingInstance[]): HospitalMetadata {
  let totalBeds = 0;
  let erBeds = 0;
  let operatingRooms = 0;
  let traumaRooms = 0;
  let ambulances = 0;
  let rooms = 0;
  let doctors = 0;
  let nurses = 0;
  let totalFloorArea = 0;
  let groundFloorArea = 0;
  let maxFloors = 0;

  for (const building of buildings) {
    const spec = building.spec;

    totalBeds += spec.hospitalBeds ?? 0;
    erBeds += spec.hospitalEmergencyBays ?? 0;
    operatingRooms += spec.hospitalOperatingRooms ?? 0;
    traumaRooms += spec.hospitalTraumaRooms ?? 0;
    ambulances += spec.hospitalAmbulances ?? 0;
    rooms += spec.hospitalRooms ?? 0;
    doctors += spec.hospitalDoctors ?? 0;
    nurses += spec.hospitalNurses ?? 0;

    const bFloorArea = spec.width * spec.depth * spec.numberOfFloors;
    const bGroundArea = spec.width * spec.depth;
    totalFloorArea += bFloorArea;
    groundFloorArea += bGroundArea;
    maxFloors = Math.max(maxFloors, spec.numberOfFloors);
  }

  // Nurse allocation: OR -> Trauma -> ED -> Inpatient (same priority as HospitalForm)
  const nursesNeededForOR = operatingRooms * NURSES_PER_OR;
  const nursesNeededForTrauma = traumaRooms * 1; // 1:1 ratio
  const nursesNeededForED = Math.ceil(erBeds / NURSE_PER_ED_BAYS);
  const nursesAfterOR = Math.max(0, nurses - nursesNeededForOR);
  const nursesForTrauma = Math.min(nursesAfterOR, nursesNeededForTrauma);
  const nursesAfterTrauma = Math.max(0, nursesAfterOR - nursesForTrauma);
  const nursesForED = Math.min(nursesAfterTrauma, nursesNeededForED);
  const nursesForInpatient = Math.max(0, nursesAfterTrauma - nursesForED);

  // Doctor allocation: ED first, then inpatient
  const doctorsNeededForED = Math.ceil(erBeds / DOCTOR_PER_ED_BAYS);
  const doctorsForED = Math.min(doctors, doctorsNeededForED);
  const doctorsForInpatient = Math.max(0, doctors - doctorsForED);

  const usableInpatientBeds = Math.min(
    totalBeds,
    Math.floor(nursesForInpatient * NURSE_PER_INPATIENT_BEDS),
    Math.floor(doctorsForInpatient * DOCTOR_PER_INPATIENT_BEDS)
  );
  const usableORs = Math.min(operatingRooms, Math.floor(nurses / NURSES_PER_OR));
  const usableERBays = Math.min(
    erBeds,
    Math.floor(nursesForED * NURSE_PER_ED_BAYS),
    Math.floor(doctorsForED * DOCTOR_PER_ED_BAYS)
  );

  return {
    totalBeds,
    erBeds,
    operatingRooms,
    traumaRooms,
    ambulances,
    rooms,
    doctors,
    nurses,
    usableInpatientBeds,
    usableERBays,
    usableORs,
    totalFloorArea,
    groundFloorArea,
    numberOfFloors: maxFloors,
    createdAt: new Date().toISOString(),
  };
}
