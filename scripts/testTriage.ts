/**
 * Test script for POST /api/clearpath/triage
 * Run with: npx tsx scripts/testTriage.ts (or ts-node)
 * Ensure the Next.js dev server is running (e.g. npm run dev) so the API is available at http://localhost:3000
 */

const BASE_URL = process.env.TRIAGE_TEST_BASE_URL ?? 'http://localhost:3000';

const testPayload = {
  vitals: {
    heartRate: 120,
    respiratoryRate: 28,
    stressIndex: 0.8,
  },
  symptoms: {
    chestPain: true,
    shortnessOfBreath: true,
    fever: false,
    dizziness: false,
  },
  city: 'toronto',
};

async function main() {
  console.log('Sending test payload to', `${BASE_URL}/api/clearpath/triage`);
  console.log('Payload:', JSON.stringify(testPayload, null, 2));

  try {
    const res = await fetch(`${BASE_URL}/api/clearpath/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Error:', res.status, data?.error ?? data);
      process.exit(1);
    }

    console.log('\n--- Triage result ---');
    console.log('severity:', data.severity);
    console.log('reasoning:', data.reasoning);
    console.log('---');
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
}

main();
