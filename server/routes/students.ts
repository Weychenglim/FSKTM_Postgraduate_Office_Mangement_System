import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_STUDENTS } from '../../src/mocks/students.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth);

studentsRouter.get('/', (_req, res) => {
  res.json(MOCK_STUDENTS);
});

studentsRouter.get('/:id', (req, res) => {
  const student = MOCK_STUDENTS.find(s => s.id === req.params.id);
  if (!student) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  res.json(student);
});
