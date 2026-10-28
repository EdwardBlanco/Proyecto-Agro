import { Router } from 'express';
import {
  crearPredio,
  listarPredios,
  obtenerPredioPorId,
  actualizarPredio,
  cambiarEstado
} from '../controllers/predios.controller.js';
import {
  crearPredioValidator,
  actualizarPredioValidator,
  cambiarEstadoPredioValidator
} from '../validators/predios.validator.js';
import { idValidator } from '../validators/common.validator.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';

const router = Router();

// Todas las rutas de predios requieren autenticación
router.use(validarJWT);

// Rutas de consulta (lectura)
router.get('/', listarPredios);
router.get('/:id', idValidator, validarCampos, obtenerPredioPorId);

// Rutas de administración (superadmin y administrador)
router.post(
  '/',
  authorizeRole('superadmin', 'administrador'),
  crearPredioValidator,
  validarCampos,
  crearPredio
);

router.patch(
  '/:id/estado',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...cambiarEstadoPredioValidator],
  validarCampos,
  cambiarEstado
);

router.patch(
  '/:id',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...actualizarPredioValidator],
  validarCampos,
  actualizarPredio
);

export default router;
