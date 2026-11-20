import { Router } from 'express';
import {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  changePassword
} from '../controllers/users.controller.js';
import {
  createUserValidator,
  updateUserValidator,
  changeUserStatusValidator,
  changePasswordValidator
} from '../validators/users.validator.js';
import { idValidator } from '../validators/common.validator.js';
import { validateFields } from '../middlewares/validateFields.js';
import { validateJwt } from '../middlewares/validateJwt.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';

const router = Router();

// Todas las rutas de usuarios requieren autenticación mediante JWT
router.use(validateJwt);

// Cambio de contraseña del propio usuario autenticado
router.patch('/me/contrasena', changePasswordValidator, validateFields, changePassword);

// La administración y consulta del directorio de usuarios son exclusivas del superadmin
router.post(
  '/',
  authorizeRole('superadmin'),
  createUserValidator,
  validateFields,
  createUser
);

router.get(
  '/',
  authorizeRole('superadmin'),
  listUsers
);

router.get(
  '/:id',
  authorizeRole('superadmin'),
  idValidator,
  validateFields,
  getUserById
);

router.patch(
  '/:id/estado',
  authorizeRole('superadmin'),
  [...idValidator, ...changeUserStatusValidator],
  validateFields,
  changeUserStatus
);

router.patch(
  '/:id',
  authorizeRole('superadmin'),
  [...idValidator, ...updateUserValidator],
  validateFields,
  updateUser
);

export default router;
