import type { ClearPathScenario } from './types';

export interface ScenarioParams {
  occupancyMultiplier: number;
  waitMinutesOffset: number;
  /** For mass_casualty: how many hospitals get spiked (e.g. 2-3) */
  spikeHospitalCount?: number;
  spikeOccupancyMin?: number;
  spikeOccupancyMax?: number;
}

export const SCENARIO_PARAMS: Record<ClearPathScenario, ScenarioParams> = {
  normal: {
    occupancyMultiplier: 1.0,
    waitMinutesOffset: 0,
  },
  flu_season: {
    occupancyMultiplier: 1.12,
    waitMinutesOffset: 15,
  },
  weekend_surge: {
    occupancyMultiplier: 1.08,
    waitMinutesOffset: 20,
  },
  mass_casualty: {
    occupancyMultiplier: 1.05,
    waitMinutesOffset: 30,
    spikeHospitalCount: 3,
    spikeOccupancyMin: 92,
    spikeOccupancyMax: 98,
  },
};

export const SCENARIO_OPTIONS: { value: ClearPathScenario; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'flu_season', label: 'Flu season' },
  { value: 'weekend_surge', label: 'Weekend surge' },
  { value: 'mass_casualty', label: 'Mass casualty event' },
];

export const DEFAULT_SCENARIO: ClearPathScenario = 'normal';
