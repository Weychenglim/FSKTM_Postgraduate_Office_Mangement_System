import { Router } from 'express';
import { requireAuth } from '../middleware.js';
import {
  MOCK_SUPERVISOR_APPOINTMENTS,
  MOCK_PANEL_APPOINTMENTS,
  MOCK_SUPERVISOR_REQUESTS,
  MOCK_ACTIVE_SUPERVISEES,
  MOCK_PANEL_ASSIGNMENTS,
  MOCK_PANEL_RECOMMENDATION_DRAFTS,
  MOCK_PANEL_RECOMMENDATIONS,
  MOCK_SUPERVISOR_REQUEST_HISTORY,
} from '../../src/mocks/appointments.js';

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

appointmentsRouter.get('/supervisor', (_req, res) => {
  res.json(MOCK_SUPERVISOR_APPOINTMENTS);
});

appointmentsRouter.get('/panel', (_req, res) => {
  res.json(MOCK_PANEL_APPOINTMENTS);
});

appointmentsRouter.get('/supervisor/requests', (_req, res) => {
  res.json(MOCK_SUPERVISOR_REQUESTS);
});

appointmentsRouter.get('/supervisor/supervisees', (_req, res) => {
  res.json(MOCK_ACTIVE_SUPERVISEES);
});

appointmentsRouter.get('/supervisor/request-history', (_req, res) => {
  res.json(MOCK_SUPERVISOR_REQUEST_HISTORY);
});

appointmentsRouter.get('/panel/assignments', (_req, res) => {
  res.json(MOCK_PANEL_ASSIGNMENTS);
});

appointmentsRouter.get('/panel/recommendation-drafts', (_req, res) => {
  res.json(MOCK_PANEL_RECOMMENDATION_DRAFTS);
});

appointmentsRouter.get('/panel/recommendations', (_req, res) => {
  res.json(MOCK_PANEL_RECOMMENDATIONS);
});
