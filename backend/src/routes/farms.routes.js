import { Router } from 'express';
import {
  createFarm,
  listFarms,
  getFarmById,
  updateFarm,
  changeFarmStatus
} from '../controllers/farms.controller.js';
import {
  createFarmValidator,
  updateFarmValidator,
  changeFarmStatusValidator
} from '../validators/farms.validator.js';
import { idValidator } from '../validators/common.validator.js';
import { validateFields } from '../middlewares/validateFields.js';
import { validateJwt } from '../middlewares/validateJwt.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';

const router = Router();

// Todas las rutas de predios requieren autenticación mediante JWT
router.use(validateJwt);

// Rutas de consulta (lectura para cualquier rol autenticado)
router.get('/', listFarms);
router.get('/:id', idValidator, validateFields, getFarmById);

// Rutas administrativas (restringidas a superadmin y administrador)
router.post(
  '/',
  authorizeRole('superadmin', 'administrador'),
  createFarmValidator,
  validateFields,
  createFarm
);

router.patch(
  '/:id/estado',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...changeFarmStatusValidator],
  validateFields,
  changeFarmStatus
);

router.patch(
  '/:id',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...updateFarmValidator],
  validateFields,
  updateFarm
);

export default router;
