import { Router, Request, Response } from 'express';
import { getUserByAuth0Id, createUser, updateUser } from '../db/queries';

export const usersRouter = Router();

usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getUserByAuth0Id(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

usersRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
