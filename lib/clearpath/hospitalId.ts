/**
 * Normalize hospital ID for both MongoDB documents (_id) and synthetic objects (id).
 * Use everywhere hospital IDs are read or compared.
 */

export interface HospitalLike {
  _id?: { toString: () => string } | string;
  id?: string;
}

export function getHospitalId(hospital: HospitalLike): string {
  if (!hospital) return '';
  const id = hospital._id;
  if (id != null) {
    return typeof id === 'string' ? id : id.toString();
  }
  return hospital.id ?? '';
}
