import { Router } from 'express';
import { obtenerResumen } from '../controllers/dashboard.controller.js';
import { validarJWT } from '../middlewares/validar-jwt.js';

const router = Router();

// Todas las rutas del dashboard requieren autenticación
router.use(validarJWT);

// GET /api/v1/dashboard/resumen
router.get('/resumen', obtenerResumen);

export default router;
