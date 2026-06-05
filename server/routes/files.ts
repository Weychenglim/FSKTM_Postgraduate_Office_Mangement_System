import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_FILES } from '../../src/mocks/files.js';
import { MOCK_STUDENT_SUBMISSIONS } from '../../src/mocks/submissions.js';

export const filesRouter = Router();
filesRouter.use(requireAuth);

filesRouter.get('/', (req, res) => {
  const { studentId } = req.query;
  if (typeof studentId === 'string') {
    res.json(MOCK_FILES.filter(f => f.studentId === studentId));
    return;
  }
  res.json(MOCK_FILES);
});

// /api/files/submissions — matches the frontend service stub path /student/submissions
// which the Vite proxy rewrites to /api/student/submissions; handled in index.ts
filesRouter.get('/submissions', (_req, res) => {
  res.json(MOCK_STUDENT_SUBMISSIONS);
});
