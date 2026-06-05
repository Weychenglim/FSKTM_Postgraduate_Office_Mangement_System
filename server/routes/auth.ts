import { Router } from 'express';
import { findUserByCredentials, signToken } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { identifier, password } = req.body as { identifier: string; password: string };
  if (!identifier || !password) {
    res.status(400).json({ error: 'identifier and password are required.' });
    return;
  }
  try {
    const user = await findUserByCredentials(identifier, password);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service unavailable.' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully.' });
});
