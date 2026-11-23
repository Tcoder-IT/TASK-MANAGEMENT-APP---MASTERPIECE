import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import morgan from 'morgan';
import { env, corsOrigins } from './config/env.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/course.js';
import taskRoutes from './routes/task.js';
import statsRoutes from './routes/stats.js';
import sessionRoutes from './routes/session.js';
import pushRoutes from './routes/push.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());
app.use(globalRateLimiter);

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StudyFlow API',
    version: '1.0.0',
    docs: '/api/docs',
  });
});

app.use(`/api/${env.API_VERSION}/health`, healthRoutes);
app.use(`/api/${env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${env.API_VERSION}/courses`, courseRoutes);
app.use(`/api/${env.API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${env.API_VERSION}/stats`, statsRoutes);
app.use(`/api/${env.API_VERSION}/sessions`, sessionRoutes);
app.use(`/api/${env.API_VERSION}/push`, pushRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app, connectDB };