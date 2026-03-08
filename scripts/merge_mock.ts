import fs from 'fs';
import { extractedHospitals } from '../extracted_hospitals';

let mockDataContent = fs.readFileSync('lib/clearpath/mockData.ts', 'utf8');

const filteredHospitals = extractedHospitals.filter(h => h.lat !== null && h.lng !== null).map((h, i) => ({
  id: `odhf-${i}`,
  name: h.name,
  city: h.city,
  latitude: h.lat,
  longitude: h.lng,
  totalBeds: h.totalBeds,
  erBeds: h.erBeds,
  phone: h.phone,
  website: 'https://ontario.ca',
  specialties: h.specialties
}));

// Find where mockHospitals ends (the closing bracket before export const mockCongestion)
const insertIndex = mockDataContent.indexOf('];\n\nexport const mockCongestion');

if (insertIndex !== -1) {
  // We need to inject our filteredHospitals into the array
  const hospitalsString = JSON.stringify(filteredHospitals, null, 2);
  // Remove the opening and closing brackets of the JSON string, and add a leading comma
  const innerHospitals = hospitalsString.substring(2, hospitalsString.length - 2);
  
  const newContent = mockDataContent.slice(0, insertIndex) + ',\n  ' + innerHospitals + '\n' + mockDataContent.slice(insertIndex);
  
  fs.writeFileSync('lib/clearpath/mockData.ts', newContent);
  console.log(`Successfully merged ${filteredHospitals.length} ODHF hospitals into mockData.ts`);
} else {
  console.error('Could not find injection point in mockData.ts');
}
