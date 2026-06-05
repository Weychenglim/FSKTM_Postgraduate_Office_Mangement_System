import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_STAFF } from '../../src/mocks/lecturers.js';

export const staffRouter = Router();
staffRouter.use(requireAuth);

staffRouter.get('/', (req, res) => {
  const { role } = req.query;
  if (typeof role === 'string') {
    res.json(MOCK_STAFF.filter(s => s.role === role));
    return;
  }
  res.json(MOCK_STAFF);
});
