import { Router } from 'express';
import { getSummary } from '../controllers/dashboard.controller.js';
import { validateJwt } from '../middlewares/validateJwt.js';

const router = Router();

// Todas las rutas del dashboard requieren autenticación
router.use(validateJwt);

// GET /api/v1/dashboard/resumen - Resumen de indicadores según el rol
router.get('/resumen', getSummary);

export default router;
