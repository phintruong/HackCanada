import { useMemo } from 'react';
import { BuildingSpecification } from '@/lib/editor/types/buildingSpec';
import { useBuildingSound } from '@/lib/editor/hooks/useBuildingSound';

interface HospitalFormProps {
  spec: BuildingSpecification;
  onUpdate: (updates: Partial<BuildingSpecification>) => void;
}

const SLIDER_CLASS =
  'flex-4 h-4 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-400 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing';

const INPUT_CLASS =
  'flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-center focus:border-blue-400 focus:outline-none transition-colors duration-200';

// Staffing ratio constants (from BC Nurses' Union, Ontario health data, AORN)
const NURSE_PER_INPATIENT_BEDS = 4.5;   // 1 nurse per 4-5 med/surg beds (BC: 1:4, CA: 1:5)
const DOCTOR_PER_INPATIENT_BEDS = 18;    // 1 attending per 17-20 patients (Ontario study)
const NURSES_PER_OR = 2.5;               // 2.5 perioperative nurses per surgical suite (BC)
const NURSE_PER_ED_BAYS = 3;             // 1 nurse per 3 general ED patients (BC)
const DOCTOR_PER_ED_BAYS = 10;           // outcomes worsen above 10 patients/physician (ScienceDirect)
const BED_OCCUPANCY_WARNING = 0.85;      // above 85% occupancy, flow problems likely (NCBI)
const RECOVERY_BAYS_PER_OR = 2;          // Stage 1 recovery: ~2 bays per OR
const NURSE_PER_TRAUMA_ROOM = 1;         // 1:1 ratio for trauma/resuscitation (critical care)
const AMBULANCE_BAY_AREA = 27;           // ~3.6m x 7.6m per ambulance bay (FGI guidelines)

export function HospitalForm({ spec, onUpdate }: HospitalFormProps) {
  const { play: playSound } = useBuildingSound();

  // Calculate building size metrics
  const totalFloorArea = spec.width * spec.depth * spec.numberOfFloors;
  const groundFloorArea = spec.width * spec.depth;

  // Current values
  const beds = spec.hospitalBeds ?? 0;
  const rooms = spec.hospitalRooms ?? 0;
  const doctors = spec.hospitalDoctors ?? 0;
  const nurses = spec.hospitalNurses ?? 0;
  const ors = spec.hospitalOperatingRooms ?? 0;
  const edBays = spec.hospitalEmergencyBays ?? 0;
  const ambulances = spec.hospitalAmbulances ?? 0;
  const traumaRooms = spec.hospitalTraumaRooms ?? 0;

  // Physical maximums based on building size
  const limits = useMemo(() => {
    // Patient rooms: ~46 sq m per room (500 sq ft standard room + circulation)
    const maxRooms = Math.max(1, Math.floor(totalFloorArea / 46));
    // Beds: ~19 sq m per bed (~200 sq ft), can exceed rooms via shared rooms
    const maxBeds = Math.max(1, Math.floor(totalFloorArea / 19));
    // Operating rooms: ~56 sq m each + support, ~1 per 2,000 sq m total
    const maxOperatingRooms = Math.max(1, Math.floor(totalFloorArea / 2000));
    // Emergency bays: ground floor only, ~1 per 30 sq m
    const maxEmergencyBays = Math.max(1, Math.floor(groundFloorArea / 30));
    // Ambulances: ground-floor bay space (~27 sq m each), also ~1 per 5 ED bays
    const maxAmbulancesBySpace = Math.max(1, Math.floor(groundFloorArea / (AMBULANCE_BAY_AREA * 4)));
    const maxAmbulances = maxAmbulancesBySpace;
    // Trauma/resuscitation rooms: ground floor, ~1 per 15 ED bays, ~40-50 sq m each
    const maxTraumaRooms = Math.max(1, Math.min(
      Math.floor(groundFloorArea / 200),  // space constraint
      Math.max(1, Math.floor(maxEmergencyBays / 8))  // ratio to ED size
    ));
    // Staff capacity pool: ~1 staff per 40 sq m
    const maxTotalStaff = Math.max(2, Math.floor(totalFloorArea / 40));

    return { maxRooms, maxBeds, maxOperatingRooms, maxEmergencyBays, maxAmbulances, maxTraumaRooms, maxTotalStaff };
  }, [totalFloorArea, groundFloorArea]);

  // Staff limits: doctors and nurses share a pool, complementary not interchangeable
  const staffUsed = doctors + nurses;
  const maxDoctors = Math.max(0, limits.maxTotalStaff - nurses);
  const maxNurses = Math.max(0, limits.maxTotalStaff - doctors);

  // --- Capacity analysis (the core interdependency model) ---

  // Nurse allocation: nurses are split across inpatient, OR, trauma, and ED
  // Priority: OR (hard req) → Trauma (1:1 critical) → ED → Inpatient
  const nursesNeededForOR = ors * NURSES_PER_OR;
  const nursesNeededForTrauma = traumaRooms * NURSE_PER_TRAUMA_ROOM;
  const nursesNeededForED = Math.ceil(edBays / NURSE_PER_ED_BAYS);
  const nursesAfterOR = Math.max(0, nurses - nursesNeededForOR);
  const nursesForTrauma = Math.min(nursesAfterOR, nursesNeededForTrauma);
  const nursesAfterTrauma = Math.max(0, nursesAfterOR - nursesForTrauma);
  const nursesForED = Math.min(nursesAfterTrauma, nursesNeededForED);
  const nursesForInpatient = Math.max(0, nursesAfterTrauma - nursesForED);

  // Doctor allocation: ED doctors first, then inpatient
  const doctorsNeededForED = Math.ceil(edBays / DOCTOR_PER_ED_BAYS);
  const doctorsForED = Math.min(doctors, doctorsNeededForED);
  const doctorsForInpatient = Math.max(0, doctors - doctorsForED);

  // Usable capacity formulas
  const usableInpatientBeds = Math.min(
    beds,
    Math.floor(nursesForInpatient * NURSE_PER_INPATIENT_BEDS),
    Math.floor(doctorsForInpatient * DOCTOR_PER_INPATIENT_BEDS)
  );
  const usableORs = Math.min(ors, Math.floor(nurses / NURSES_PER_OR));
  const usableEDBays = Math.min(
    edBays,
    Math.floor(nursesForED * NURSE_PER_ED_BAYS),
    Math.floor(doctorsForED * DOCTOR_PER_ED_BAYS)
  );

  // Occupancy and warnings
  const bedOccupancyRate = beds > 0 ? usableInpatientBeds / beds : 0;
  const recoveryBaysNeeded = ors * RECOVERY_BAYS_PER_OR;

  // Warning flags
  const nurseShortage = nurses < nursesNeededForOR + nursesNeededForTrauma + nursesNeededForED;
  const bedBottleneck = beds > 0 && usableInpatientBeds < beds;
  const orUnderstaffed = ors > 0 && usableORs < ors;
  const edUnderstaffed = edBays > 0 && usableEDBays < edBays;
  const bedsExceedRooms = beds > rooms * 4; // more than 4 beds/room is unrealistic
  const traumaUnderstaffed = traumaRooms > 0 && nursesForTrauma < nursesNeededForTrauma;
  const ambulancesExceedED = ambulances > 0 && edBays === 0;

  const clampedUpdate = (key: keyof BuildingSpecification, value: number, max: number) => {
    onUpdate({ [key]: Math.min(Math.max(0, value), max) });
    playSound('resize_object');
  };

  const fields: {
    label: string;
    key: keyof BuildingSpecification;
    max: number;
    value: number;
    description: string;
    warning?: string;
  }[] = [
    {
      label: 'Patient Rooms',
      key: 'hospitalRooms',
      max: limits.maxRooms,
      value: Math.min(rooms, limits.maxRooms),
      description: 'Layout constraint for bed placement and infection control',
      warning: bedsExceedRooms ? 'Too many beds for this room count (max ~4 per room)' : undefined,
    },
    {
      label: 'Beds',
      key: 'hospitalBeds',
      max: limits.maxBeds,
      value: Math.min(beds, limits.maxBeds),
      description: 'Primary staffing driver — beds determine nurse and doctor demand',
      warning: bedBottleneck ? `Only ${usableInpatientBeds} of ${beds} beds safely staffed` : undefined,
    },
    {
      label: 'Doctors',
      key: 'hospitalDoctors',
      max: maxDoctors,
      value: Math.min(doctors, maxDoctors),
      description: 'Complementary to nurses — improve throughput, not a substitute',
    },
    {
      label: 'Nurses',
      key: 'hospitalNurses',
      max: maxNurses,
      value: Math.min(nurses, maxNurses),
      description: 'Primary capacity unlock — required for beds, ORs, and ED',
      warning: nurseShortage ? `Need ${Math.ceil(nursesNeededForOR + nursesNeededForTrauma + nursesNeededForED)} just for OR + Trauma + ED coverage` : undefined,
    },
    {
      label: 'Operating Rooms',
      key: 'hospitalOperatingRooms',
      max: limits.maxOperatingRooms,
      value: Math.min(ors, limits.maxOperatingRooms),
      description: `Each OR needs ~${NURSES_PER_OR} periop nurses + ${RECOVERY_BAYS_PER_OR} recovery bays`,
      warning: orUnderstaffed ? `Only ${usableORs} of ${ors} ORs have nurse coverage` : undefined,
    },
    {
      label: 'Emergency Bays',
      key: 'hospitalEmergencyBays',
      max: limits.maxEmergencyBays,
      value: Math.min(edBays, limits.maxEmergencyBays),
      description: 'Ground-floor only — 1 nurse per 3 patients, 1 doctor per 10',
      warning: edUnderstaffed ? `Only ${usableEDBays} of ${edBays} ED bays safely staffed` : undefined,
    },
    {
      label: 'Trauma / Resuscitation Rooms',
      key: 'hospitalTraumaRooms',
      max: limits.maxTraumaRooms,
      value: Math.min(traumaRooms, limits.maxTraumaRooms),
      description: 'Critical care rooms in ED — 1:1 nurse ratio required',
      warning: traumaUnderstaffed ? `Only ${nursesForTrauma} of ${nursesNeededForTrauma} trauma nurses covered` : undefined,
    },
    {
      label: 'Ambulances',
      key: 'hospitalAmbulances',
      max: limits.maxAmbulances,
      value: Math.min(ambulances, limits.maxAmbulances),
      description: `Ground-floor bay parking (~${AMBULANCE_BAY_AREA} sq m each) — feeds ED intake`,
      warning: ambulancesExceedED ? 'Ambulances have no ED bays to deliver patients to' : undefined,
    },
  ];

  const hasActivity = beds > 0 || ors > 0 || edBays > 0 || traumaRooms > 0 || ambulances > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Hospital Parameters</h3>

      {/* Building size summary */}
      <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 space-y-1">
        <p className="text-sm text-gray-700">
          Building Size: <span className="font-bold text-blue-700">{spec.width}m x {spec.depth}m</span>
        </p>
        <p className="text-sm text-gray-700">
          Floors: <span className="font-bold text-blue-700">{spec.numberOfFloors}</span>
        </p>
        <p className="text-sm text-gray-700">
          Total Floor Area: <span className="font-bold text-blue-700">{totalFloorArea.toLocaleString()} sq m</span>
          <span className="text-gray-400 text-xs ml-1">({Math.round(totalFloorArea * 10.764).toLocaleString()} sq ft)</span>
        </p>
        <p className="text-sm text-gray-700">
          Staff: <span className="font-bold text-blue-700">{staffUsed}</span>
          <span className="text-gray-500"> / {limits.maxTotalStaff} capacity</span>
        </p>
      </div>

      {/* Sliders */}
      {fields.map(({ label, key, max, value, description, warning }) => (
        <div key={key} className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            {label}: <span className="text-blue-600">{value}</span>
            <span className="text-gray-400 text-xs ml-2">(max: {max})</span>
          </label>
          <p className="text-xs text-gray-500 -mt-1">{description}</p>
          {warning && (
            <p className="text-xs text-orange-600 font-medium -mt-0.5">{warning}</p>
          )}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={max}
              step="1"
              value={value}
              onChange={(e) => clampedUpdate(key, parseInt(e.target.value), max)}
              className={SLIDER_CLASS}
            />
            <input
              type="number"
              min="0"
              max={max}
              step="1"
              value={value}
              onChange={(e) => clampedUpdate(key, parseInt(e.target.value) || 0, max)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ))}

      {/* Capacity Analysis Dashboard */}
      {hasActivity && (
        <div className="pt-4 mt-2 border-t-2 border-gray-200 space-y-3">
          <h4 className="text-sm font-bold text-gray-800">Capacity Analysis</h4>

          {/* Usable capacity bars */}
          <div className="space-y-2">
            {beds > 0 && (
              <CapacityBar
                label="Inpatient Beds"
                usable={usableInpatientBeds}
                total={beds}
                color={usableInpatientBeds >= beds ? 'green' : usableInpatientBeds >= beds * 0.5 ? 'yellow' : 'red'}
              />
            )}
            {ors > 0 && (
              <CapacityBar
                label="Operating Rooms"
                usable={usableORs}
                total={ors}
                color={usableORs >= ors ? 'green' : 'red'}
              />
            )}
            {edBays > 0 && (
              <CapacityBar
                label="Emergency Bays"
                usable={usableEDBays}
                total={edBays}
                color={usableEDBays >= edBays ? 'green' : usableEDBays >= edBays * 0.5 ? 'yellow' : 'red'}
              />
            )}
            {traumaRooms > 0 && (
              <CapacityBar
                label="Trauma Rooms"
                usable={Math.min(traumaRooms, nursesForTrauma)}
                total={traumaRooms}
                color={nursesForTrauma >= nursesNeededForTrauma ? 'green' : 'red'}
              />
            )}
          </div>

          {/* Nurse allocation breakdown */}
          {nurses > 0 && (
            <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Nurse Allocation</p>
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div>
                  <span className="text-gray-500">OR</span>
                  <p className="font-bold text-gray-800">{Math.min(Math.ceil(nursesNeededForOR), nurses)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Trauma</span>
                  <p className="font-bold text-gray-800">{nursesForTrauma}</p>
                </div>
                <div>
                  <span className="text-gray-500">ED</span>
                  <p className="font-bold text-gray-800">{nursesForED}</p>
                </div>
                <div>
                  <span className="text-gray-500">Inpatient</span>
                  <p className="font-bold text-gray-800">{nursesForInpatient}</p>
                </div>
              </div>
            </div>
          )}

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {beds > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-gray-500">Total Beds</span>
                <p className="font-bold text-blue-700">{beds}</p>
              </div>
            )}
            {beds > 0 && rooms > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-gray-500">Beds / Room</span>
                <p className="font-bold text-gray-800">{(beds / rooms).toFixed(1)}</p>
              </div>
            )}
            {beds > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-gray-500">Staffed Occupancy</span>
                <p className={`font-bold ${bedOccupancyRate >= BED_OCCUPANCY_WARNING ? 'text-green-700' : 'text-orange-600'}`}>
                  {(bedOccupancyRate * 100).toFixed(0)}%
                </p>
              </div>
            )}
            {beds > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-gray-500">Sq m / Bed</span>
                <p className="font-bold text-gray-800">{(totalFloorArea / beds).toFixed(0)}</p>
              </div>
            )}
            {ors > 0 && (
              <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <span className="text-gray-500">Recovery Bays Needed</span>
                <p className="font-bold text-gray-800">{recoveryBaysNeeded}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CapacityBar({ label, usable, total, color }: {
  label: string;
  usable: number;
  total: number;
  color: 'green' | 'yellow' | 'red';
}) {
  const pct = total > 0 ? Math.min((usable / total) * 100, 100) : 0;
  const barColor = color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = color === 'green' ? 'text-green-700' : color === 'yellow' ? 'text-yellow-700' : 'text-red-700';

  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-600">{label}</span>
        <span className={`font-bold ${textColor}`}>{usable} / {total} usable</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
