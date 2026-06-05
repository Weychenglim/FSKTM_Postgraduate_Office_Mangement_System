import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import { MOCK_LETTER_TEMPLATES } from '../../src/mocks/letters.js';

export const lettersRouter = Router();
lettersRouter.use(requireAuth);

lettersRouter.get('/', (_req, res) => {
  res.json(MOCK_LETTER_TEMPLATES);
});
