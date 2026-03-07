import { Router, Request, Response } from 'express';
import { getTriageHistory } from '../db/queries';

export const historyRouter = Router();

historyRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const history = await getTriageHistory(req.params.userId);
    res.json(history);
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
