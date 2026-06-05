import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_TIMELINE_ENTRIES } from '../../src/mocks/timeline.js';

export const timelineRouter = Router();
timelineRouter.use(requireAuth);

timelineRouter.get('/', (_req, res) => {
  res.json(MOCK_TIMELINE_ENTRIES);
});
