import fs from 'fs';
import csvParser from 'csv-parser';

// The data structure we want to match our mockData.ts
interface ExtractedHospital {
    name: string;
    city: string;
    lat: number;
    lng: number;
    erBeds: number;
    totalBeds: number;
    phone: string;
    specialties: string[];
}

const targetCities = ['toronto', 'mississauga', 'waterloo'];
const results: ExtractedHospital[] = [];

console.log('Starting ODHF CSV parsing...');

fs.createReadStream('./odhf_v1.1.csv')
    .pipe(csvParser())
    .on('data', (data) => {
        // 1. Ensure it's in Ontario
        // 2. Ensure it's a Hospital
        // 3. Ensure it's in our target cities

        const province = (data['province'] || '').toLowerCase();
        const facilityType = (data['odhf_facility_type'] || '').toLowerCase();
        const city = (data['city'] || '').toLowerCase();

        if (province === 'on' && facilityType === 'hospitals' && targetCities.includes(city)) {
            results.push({
                name: data['facility_name'],
                city: city,
                lat: parseFloat(data['latitude']),
                lng: parseFloat(data['longitude']),
                // ODHF does not have these, so we mock them as standard values
                erBeds: Math.floor(Math.random() * 40 + 20), // 20-60
                totalBeds: Math.floor(Math.random() * 400 + 100), // 100-500
                phone: '416-555-0199', // Mock phone
                specialties: ['General'], // Default to General
            });
        }
    })
    .on('end', () => {
        console.log(`Extracted ${results.length} hospitals for Toronto, Mississauga, and Waterloo.`);

        // Write out the results to a new TS file that we can easily copy-paste into our mockData.ts
        const output = `export const extractedHospitals = ${JSON.stringify(results, null, 2)};`;
        fs.writeFileSync('./extracted_hospitals.ts', output);

        console.log('Saved to ./extracted_hospitals.ts');
    });
