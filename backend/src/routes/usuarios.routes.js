import { Router } from 'express';
import {
  crearUsuario,
  listarUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  cambiarEstado,
  cambiarContrasena
} from '../controllers/usuarios.controller.js';
import {
  crearUsuarioValidator,
  actualizarUsuarioValidator,
  cambiarEstadoUsuarioValidator,
  cambiarContrasenaValidator
} from '../validators/usuarios.validator.js';
import { idValidator } from '../validators/common.validator.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';
import { authorizeRole } from '../middlewares/authorizeRole.js';

const router = Router();

// Todas las rutas de usuarios requieren autenticación
router.use(validarJWT);

// Cambio de contraseña del propio usuario autenticado
router.patch('/me/contrasena', cambiarContrasenaValidator, validarCampos, cambiarContrasena);

// Rutas administrativas (superadmin y administrador)
router.post(
  '/',
  authorizeRole('superadmin', 'administrador'),
  crearUsuarioValidator,
  validarCampos,
  crearUsuario
);

router.get(
  '/',
  authorizeRole('superadmin', 'administrador'),
  listarUsuarios
);

router.get(
  '/:id',
  authorizeRole('superadmin', 'administrador'),
  idValidator,
  validarCampos,
  obtenerUsuarioPorId
);

router.patch(
  '/:id/estado',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...cambiarEstadoUsuarioValidator],
  validarCampos,
  cambiarEstado
);

router.patch(
  '/:id',
  authorizeRole('superadmin', 'administrador'),
  [...idValidator, ...actualizarUsuarioValidator],
  validarCampos,
  actualizarUsuario
);

export default router;
