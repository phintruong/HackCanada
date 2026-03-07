// Traffic time-of-day multipliers (index 0-23 = hour of day)
// Applied as sanity-check floor on Mapbox real-time data
const TRAFFIC_MULTIPLIERS: Record<string, number[]> = {
  weekday: [
    0.85, 0.80, 0.80, 0.80, 0.85, 0.95, // 00-05: overnight
    1.15, 1.40, 1.45, 1.20, 1.05, 1.00, // 06-11: morning rush 7-9
    1.05, 1.00, 1.00, 1.10, 1.35, 1.45, // 12-17: evening rush 16-18
    1.25, 1.10, 1.00, 0.95, 0.90, 0.85, // 18-23: evening decline
  ],
  weekend: [
    0.80, 0.75, 0.75, 0.75, 0.75, 0.80, // 00-05
    0.85, 0.90, 0.95, 1.00, 1.05, 1.10, // 06-11
    1.10, 1.05, 1.05, 1.05, 1.00, 0.95, // 12-17
    0.90, 0.85, 0.85, 0.80, 0.80, 0.80, // 18-23
  ],
};

// ER volume multipliers — adjusts expected wait times by hour
const ER_VOLUME_MULTIPLIERS: Record<string, number[]> = {
  weekday: [
    0.60, 0.50, 0.45, 0.40, 0.45, 0.55, // overnight low
    0.70, 0.80, 0.90, 1.00, 1.10, 1.15, // morning ramp
    1.10, 1.05, 1.00, 1.05, 1.10, 1.20, // afternoon
    1.30, 1.25, 1.15, 1.05, 0.90, 0.75, // evening peak then decline
  ],
  weekend: [
    0.70, 0.60, 0.50, 0.45, 0.45, 0.50, // overnight
    0.60, 0.70, 0.80, 0.95, 1.10, 1.20, // morning
    1.25, 1.20, 1.15, 1.10, 1.05, 1.10, // afternoon
    1.15, 1.10, 1.00, 0.90, 0.80, 0.75, // evening
  ],
};

function getDayType(now: Date): string {
  return [0, 6].includes(now.getDay()) ? 'weekend' : 'weekday';
}

/**
 * Apply temporal adjustment to driving time.
 * Uses Mapbox real-time data as primary, with historical pattern as a floor.
 */
export function getAdjustedDrivingTime(
  mapboxMinutes: number,
  distanceKm: number,
  now: Date = new Date()
): number {
  const dayType = getDayType(now);
  const hour = now.getHours();
  const baselineMinutes = (distanceKm / 40) * 60; // assume 40 km/h baseline
  const historicalEstimate = baselineMinutes * TRAFFIC_MULTIPLIERS[dayType][hour];

  // Use Mapbox data but never below 70% of historical estimate
  return Math.max(mapboxMinutes, historicalEstimate * 0.7);
}

/**
 * Adjust wait time based on expected ER volume trend.
 * If ER volume is expected to rise in the next hour, wait will likely increase.
 */
export function getAdjustedWaitTime(
  reportedWaitMinutes: number,
  now: Date = new Date()
): number {
  const dayType = getDayType(now);
  const hour = now.getHours();
  const currentMultiplier = ER_VOLUME_MULTIPLIERS[dayType][hour];
  const futureMultiplier = ER_VOLUME_MULTIPLIERS[dayType][(hour + 1) % 24];
  const trend = futureMultiplier / currentMultiplier;
  return Math.round(reportedWaitMinutes * trend);
}

/**
 * Get a human-readable label for current traffic/ER conditions
 */
export function getTemporalContext(now: Date = new Date()): string {
  const dayType = getDayType(now);
  const hour = now.getHours();
  const trafficMult = TRAFFIC_MULTIPLIERS[dayType][hour];
  const erMult = ER_VOLUME_MULTIPLIERS[dayType][hour];

  const traffic =
    trafficMult >= 1.3 ? 'heavy traffic' : trafficMult >= 1.1 ? 'moderate traffic' : 'light traffic';
  const erVolume =
    erMult >= 1.15 ? 'high ER volume' : erMult >= 0.9 ? 'normal ER volume' : 'low ER volume';

  return `${traffic}, ${erVolume}`;
}
