import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { triageRouter } from './routes/triage';
import { vitalsRouter } from './routes/vitals';
import { waitTimesRouter } from './routes/waittimes';
import { clinicsRouter } from './routes/clinics';
import { usersRouter } from './routes/users';
import { familyRouter } from './routes/family';
import { historyRouter } from './routes/history';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/triage', triageRouter);
app.use('/vitals', vitalsRouter);
app.use('/waittimes', waitTimesRouter);
app.use('/clinics', clinicsRouter);
app.use('/users', usersRouter);
app.use('/family', familyRouter);
app.use('/history', historyRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ER Triage API running on port ${PORT}`);
});
