import express from 'express';
import cors from 'cors';

import config from './config/env.js';
import AppError from './shared/errors/AppError.js';
import errorHandler from './middlewares/errorHandler.js';

// Rutas de la aplicación
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import prediosRoutes from './routes/predios.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express();

// Middlewares base (sin morgan ni helmet según directriz de requerimiento)
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Montaje de rutas de la API v1
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);
app.use('/api/v1/predios', prediosRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Manejo de rutas inexistentes (404)
app.all('*', (req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
});

// Middleware global de manejo de errores
app.use(errorHandler);

export default app;
