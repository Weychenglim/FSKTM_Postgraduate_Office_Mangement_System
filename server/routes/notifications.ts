import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_NOTIFICATIONS } from '../../src/mocks/notifications.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', (_req, res) => {
  res.json(MOCK_NOTIFICATIONS);
});
