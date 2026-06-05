import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth.js';
import { studentsRouter } from './routes/students.js';
import { staffRouter } from './routes/staff.js';
import { appointmentsRouter } from './routes/appointments.js';
import { marksRouter } from './routes/marks.js';
import { filesRouter } from './routes/files.js';
import { announcementsRouter } from './routes/announcements.js';
import { notificationsRouter } from './routes/notifications.js';
import { timelineRouter } from './routes/timeline.js';
import { lettersRouter } from './routes/letters.js';
import { requireAuth } from './middleware.js';
import { MOCK_STUDENT_SUBMISSIONS } from '../src/mocks/submissions.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.API_PORT ?? 4000);

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/staff', staffRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/marks', marksRouter);
app.use('/api/files', filesRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/letter-templates', lettersRouter);
app.get('/api/student/submissions', requireAuth, (_req, res) => {
  res.json(MOCK_STUDENT_SUBMISSIONS);
});

app.listen(PORT, () => {
  console.log(`FSKTM PG Office API  →  http://localhost:${PORT}`);
  console.log(`Health check         →  http://localhost:${PORT}/api/health`);
});
