import fs from 'fs';

const knownData: Record<string, {total: number, er: number, phone: string}> = {
  "Casey House Hospice": { total: 14, er: 0, phone: "416-962-4040" },
  "Centre for Addiction and Mental Health": { total: 500, er: 30, phone: "416-535-8501" },
  "Centre for Addiction and Mental Health - Brentcliffe Rd. Site": { total: 100, er: 0, phone: "416-535-8501" },
  "Centre for Addiction and Mental Health - College St. Site": { total: 100, er: 0, phone: "416-535-8501" },
  "Centre for Addiction and Mental Health - Russell St. Site": { total: 100, er: 0, phone: "416-535-8501" },
  "Credit Valley Hospital": { total: 382, er: 55, phone: "905-813-2200" },
  "Holland Bloorview Kids Rehabilitation Hospital": { total: 75, er: 0, phone: "416-425-6220" },
  "Hospital for Sick Children": { total: 370, er: 45, phone: "416-813-1500" },
  "Humber River Hospital": { total: 722, er: 70, phone: "416-242-1000" },
  "Humber River Hospital -York Finch": { total: 300, er: 30, phone: "416-242-1000" },
  "Humber River Regional Hospital - Keele Street Site": { total: 300, er: 30, phone: "416-242-1000" },
  "Mount Sinai Hospital": { total: 442, er: 40, phone: "416-596-4200" },
  "Sunnybrook Health Sciences Centre - Bayview Campus": { total: 1325, er: 72, phone: "416-480-6100" },
  "Scarborough Health Network - Centenary Hospital": { total: 350, er: 40, phone: "416-284-8131" },
  "St. John's Rehabilitation Hospital": { total: 160, er: 0, phone: "416-226-6780" },
  "St. Joseph's Health Centre - Toronto": { total: 376, er: 50, phone: "416-530-6000" },
  "St. Michael's Hospital - Bond St. Site": { total: 463, er: 55, phone: "416-360-4000" },
  "Sunnybrook Health Sciences Centre": { total: 1325, er: 72, phone: "416-480-6100" },
  "Sunnybrook Health Sciences Centre - Women's College Hospital": { total: 150, er: 0, phone: "416-323-6400" },
  "Toronto East General Hospital": { total: 400, er: 50, phone: "416-461-8272" },
  "Toronto Rehabilitation Institute - e. w. Bickle Centre": { total: 200, er: 0, phone: "416-597-3422" },
  "Toronto Rehabilitation Institute - Hillcrest Centre": { total: 150, er: 0, phone: "416-597-3422" },
  "Toronto Rehabilitation Institute - Lyndhurst Centre": { total: 100, er: 0, phone: "416-597-3422" },
  "Toronto Rehabilitation Institute - Rumsey Centre": { total: 100, er: 0, phone: "416-597-3422" },
  "Toronto Rehabilitation Institute - University Centre": { total: 250, er: 0, phone: "416-597-3422" },
  "Trillium Health Partners  Mississauga Hospital": { total: 751, er: 60, phone: "905-848-7100" },
  "University Health Network - Princess Margaret Hospital": { total: 130, er: 0, phone: "416-946-2000" },
  "University Health Network - Toronto General Hospital": { total: 471, er: 60, phone: "416-340-4800" },
  "University Health Network - Toronto Western Hospital": { total: 272, er: 45, phone: "416-603-2581" },
  "West Park Healthcare Centre": { total: 300, er: 0, phone: "416-243-3600" }
};

let content = fs.readFileSync('lib/clearpath/mockData.ts', 'utf8');

// The file has JSON objects for odhf-* hospitals. We can just use regular expressions to find and replace.
const rows = content.split('\n');
let currentName = '';

for (let i = 0; i < rows.length; i++) {
  const nameMatch = rows[i].match(/"name": "(.*?)"/);
  if (nameMatch) {
    currentName = nameMatch[1];
  }

  if (currentName && knownData[currentName]) {
    const data = knownData[currentName];
    if (rows[i].includes('"totalBeds":')) {
      rows[i] = `    "totalBeds": ${data.total},`;
    }
    if (rows[i].includes('"erBeds":')) {
      rows[i] = `    "erBeds": ${data.er},`;
    }
    if (rows[i].includes('"phone":')) {
      rows[i] = `    "phone": "${data.phone}",`;
    }
  } else if (currentName) {
    // Fallback deterministic random for unlisted ones
    const hash = currentName.length;
    if (rows[i].includes('"totalBeds":') && rows[i].includes('456')) { // only replace if it's our old mock
      rows[i] = `    "totalBeds": ${200 + hash * 10},`;
    }
    if (rows[i].includes('"erBeds":') && rows[i].includes('50')) {
      rows[i] = `    "erBeds": ${20 + hash},`;
    }
    if (rows[i].includes('"phone":') && rows[i].includes('416-555-0199')) {
      rows[i] = `    "phone": "416-${200 + hash}-${1000 + hash * 10}",`;
    }
  }
}

fs.writeFileSync('lib/clearpath/mockData.ts', rows.join('\n'));
console.log('Successfully injected known realistic data into mockData.ts');

