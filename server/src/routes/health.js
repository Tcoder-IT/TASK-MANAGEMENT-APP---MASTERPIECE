import express from 'express';
import { getConnectionStatus } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const dbStatus = getConnectionStatus();
  const status = dbStatus.readyState === 1 ? 'ok' : 'degraded';

  return successResponse(res, {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: {
      connected: dbStatus.readyState === 1,
      host: dbStatus.host,
      name: dbStatus.name,
    },
    memory: process.memoryUsage(),
  });
}));

export default router;