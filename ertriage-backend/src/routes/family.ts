import { Router, Request, Response } from 'express';
import { getFamilyMembers, createFamilyMember, deleteFamilyMember } from '../db/queries';

export const familyRouter = Router();

familyRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const members = await getFamilyMembers(req.params.userId);
    res.json(members);
  } catch (err) {
    console.error('Family fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

familyRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, name, dob, relation, notes } = req.body;
    const member = await createFamilyMember(userId, name, dob, relation, notes);
    res.status(201).json(member);
  } catch (err) {
    console.error('Family create error:', err);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

familyRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await deleteFamilyMember(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Family delete error:', err);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});
