import express from 'express';
import cors from 'cors';

import config from './config/env.js';
import { connectDB, getDatabaseStatus } from './config/db.js';
import { seedDemoUsers } from './config/seed.js';
import AppError from './shared/errors/AppError.js';
import errorHandler from './middlewares/errorHandler.js';

// Rutas de la aplicación
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import farmsRoutes from './routes/farms.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

let demoSeeded = false;
const hasConfiguredMongoUri = () => Boolean(process.env.MONGODB_URI || process.env.MONGO_URI);

const ensureServerlessDb = async (req, res, next) => {
  if (!process.env.VERCEL || config.nodeEnv === 'test' || !hasConfiguredMongoUri()) {
    return next();
  }

  try {
    await connectDB();
    if (getDatabaseStatus() === 'connected' && !demoSeeded) {
      demoSeeded = true;
      try {
        await seedDemoUsers();
      } catch (seedError) {
        console.error('Error al inicializar usuarios demo:', seedError.message);
      }
    }

    return next();
  } catch {
    return next();
  }
};

// Middlewares base (sin morgan ni helmet según directriz de requerimiento)
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Montaje de rutas de la API v1 (se conservan rutas HTTP en español por contrato)
app.use(
  '/api/v1/health',
  async (req, res, next) => {
    if (
      process.env.VERCEL &&
      config.nodeEnv !== 'test' &&
      hasConfiguredMongoUri() &&
      getDatabaseStatus() === 'disconnected'
    ) {
      await connectDB();
    }
    return next();
  },
  healthRoutes
);
app.use('/api/v1/auth', ensureServerlessDb, authRoutes);
app.use('/api/v1/usuarios', ensureServerlessDb, usersRoutes);
app.use('/api/v1/predios', ensureServerlessDb, farmsRoutes);
app.use('/api/v1/dashboard', ensureServerlessDb, dashboardRoutes);

// Manejo de rutas inexistentes (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
});

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;
