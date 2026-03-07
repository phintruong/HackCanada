import { RequestHandler } from 'express';

// Auth middleware stub — passes all requests through
export const requireAuth: RequestHandler = (_req, _res, next) => next();
