import { Router, Request, Response } from 'express';
import { triageLimiter } from '../middleware/rateLimit';
import { classifyTriage } from '../services/geminiService';
import { TriageRequest } from '../../../shared/types';

export const triageRouter = Router();

triageRouter.post('/', triageLimiter, async (req: Request, res: Response) => {
  try {
    const { vitals, symptoms, city, memberId } = req.body as TriageRequest;

    // Classify with Gemini
    const result = await classifyTriage(vitals, symptoms);

    // TODO: fetch wait time and nearby clinics

    res.json({
      riskLevel: result.riskLevel,
      recommendation: result.recommendation,
      explanation: result.explanation,
      waitTimeEstimate: null,
      nearbyClinics: [],
    });
  } catch (err) {
    console.error('Triage error:', err);
    res.status(500).json({ error: 'Triage classification failed' });
  }
});
