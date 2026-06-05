import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_MARK_RECORDS, MOCK_EVALUATION_TASKS } from '../../src/mocks/marks.js';
import { MOCK_EVALUATION_PREVIEW_TASKS } from '../../src/mocks/evaluationTasks.js';
import { MOCK_RUBRIC_COMPONENTS } from '../../src/mocks/rubrics.js';

export const marksRouter = Router();
marksRouter.use(requireAuth);

marksRouter.get('/', (_req, res) => {
  res.json(MOCK_MARK_RECORDS);
});

marksRouter.get('/evaluation-tasks', (_req, res) => {
  res.json(MOCK_EVALUATION_PREVIEW_TASKS);
});

marksRouter.get('/rubric-components', (_req, res) => {
  res.json(MOCK_RUBRIC_COMPONENTS);
});

marksRouter.get('/my-evaluation-tasks', (_req, res) => {
  res.json(MOCK_EVALUATION_TASKS);
});

marksRouter.get('/:id', (req, res) => {
  const record = MOCK_MARK_RECORDS.find(r => r.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Mark record not found.' });
    return;
  }
  res.json(record);
});
