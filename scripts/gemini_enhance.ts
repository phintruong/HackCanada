import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env' });

const apiKey = process.env.OPENAI_API_KEY;

async function main() {
  if (!apiKey) {
    console.error("No API key found. Please set OPENAI_API_KEY in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const rawDataPath = path.resolve('extracted_hospitals.ts');
  const rawData = fs.readFileSync(rawDataPath, 'utf8');

  const prompt = `
  You are an expert at finding hospital statistics in Canada. 
  I have a JSON array of hospitals in Ontario. Many of them have mock erBeds, totalBeds, and phone numbers.
  Please return ONLY a valid JSON array of objects with the following keys for EACH hospital provided in the input:
  "name", "erBeds" (estimate if unknown, prioritize real data), "totalBeds" (estimate if unknown, prioritize real data), "phone" (real phone number), "specialties" (array of strings like ["trauma", "cardiac"] etc or ["general"]).
  Only output the raw JSON array. Do not include markdown codeblocks or any other text.
  
  Here is the input data:
  ${rawData}
  `;

  console.log("Analyzing with Gemini...");

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let jsonMatch = responseText;

    // strip markdown
    if (responseText.startsWith('```json')) {
      jsonMatch = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (responseText.startsWith('```')) {
      jsonMatch = responseText.replace(/```/g, '').trim();
    }

    // attempt to parse the AI output
    const enhancedData = JSON.parse(jsonMatch);

    console.log(`Received enhancements for ${enhancedData.length} hospitals.`);
    fs.writeFileSync('enhanced_hospitals.json', JSON.stringify(enhancedData, null, 2));
    console.log("Saved to enhanced_hospitals.json!");

  } catch (err) {
    console.error("Error from AI:", err);
  }
}

main();
