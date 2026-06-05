import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_ANNOUNCEMENTS } from '../../src/mocks/announcements.js';

export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.get('/', (_req, res) => {
  res.json(MOCK_ANNOUNCEMENTS);
});
