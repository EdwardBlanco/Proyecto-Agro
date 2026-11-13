import { body } from 'express-validator';
import { ROLES_PERMITIDOS } from '../models/Usuario.model.js';

export const crearUsuarioValidator = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El campo "nombre" es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El campo "nombre" no puede superar 100 caracteres'),
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El campo "correo" es obligatorio')
    .isEmail()
    .withMessage('El formato del correo electrónico no es válido'),
  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es obligatoria y debe tener al menos 6 caracteres')
    .isLength({ min: 6 })
    .withMessage('La contraseña es obligatoria y debe tener al menos 6 caracteres'),
  body('rol')
    .optional()
    .custom((rol) => {
      if (!ROLES_PERMITIDOS.includes(rol)) {
        throw new Error(`El rol "${rol}" no es válido. Permitidos: ${ROLES_PERMITIDOS.join(', ')}`);
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

export const actualizarUsuarioValidator = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El campo "nombre" debe ser un texto válido')
    .isLength({ max: 100 })
    .withMessage('El campo "nombre" no puede superar 100 caracteres'),
  body('correo')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El formato del correo electrónico no es válido'),
  body('rol')
    .optional()
    .custom((rol) => {
      if (!ROLES_PERMITIDOS.includes(rol)) {
        throw new Error(`El rol "${rol}" no es válido. Permitidos: ${ROLES_PERMITIDOS.join(', ')}`);
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

export const cambiarEstadoUsuarioValidator = [
  body('estado')
    .exists({ checkNull: false })
    .withMessage('El campo "estado" es obligatorio y debe ser un booleano (true o false)')
    .isBoolean()
    .withMessage('El campo "estado" es obligatorio y debe ser un booleano (true o false)')
];

export const cambiarContrasenaValidator = [
  body('contrasena_actual')
    .notEmpty()
    .withMessage('El campo "contrasena_actual" es obligatorio'),
  body('contrasena_nueva')
    .notEmpty()
    .withMessage('El campo "contrasena_nueva" es obligatorio y debe tener al menos 6 caracteres')
    .isLength({ min: 6 })
    .withMessage('El campo "contrasena_nueva" es obligatorio y debe tener al menos 6 caracteres')
    .custom((value, { req }) => {
      if (value === req.body.contrasena_actual) {
        throw new Error('La nueva contraseña debe ser distinta a la contraseña actual');
      }
      return true;
    })
];

export default {
  crearUsuarioValidator,
  actualizarUsuarioValidator,
  cambiarEstadoUsuarioValidator,
  cambiarContrasenaValidator
};
