import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { mockHospitals, mockCongestion } from './mocks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock GET /hospitals/:city
app.get('/hospitals/:city', (req: Request, res: Response) => {
    const city = String(req.params.city).toLowerCase();

    // allow "all" to return everything
    if (city === 'all') {
        return res.json(mockHospitals);
    }

    const filteredHospitals = mockHospitals.filter(h => h.city === city);

    if (filteredHospitals.length === 0) {
        return res.status(404).json({ error: `No hospitals found for city: ${city}` });
    }

    res.json(filteredHospitals);
});

// Mock GET /congestion/:city
app.get('/congestion/:city', (req: Request, res: Response) => {
    const city = String(req.params.city).toLowerCase();

    // Find hospitals for this city
    let filteredHospitals = mockHospitals;
    if (city !== 'all') {
        filteredHospitals = mockHospitals.filter(h => h.city === city);
    }

    if (filteredHospitals.length === 0) {
        return res.status(404).json({ error: `No hospitals found for city: ${city}` });
    }

    // Get hospital IDs
    const hospitalIds = filteredHospitals.map(h => h.id);

    // Filter congestion data
    const cityCongestion = mockCongestion.filter(c => hospitalIds.includes(c.hospitalId));

    // Merge them together for the frontend
    const result = filteredHospitals.map(hospital => {
        const congestion = cityCongestion.find(c => c.hospitalId === hospital.id);
        return {
            ...hospital,
            congestion: congestion || null
        };
    });

    res.json(result);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
