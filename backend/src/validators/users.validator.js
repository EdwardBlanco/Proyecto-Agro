import { body } from 'express-validator';
import { ALLOWED_ROLES } from '../models/User.model.js';

/**
 * Reglas de validación para la creación de un nuevo usuario (`POST /api/v1/usuarios`).
 * Valida nombre, correo, contraseña mínima de 6 caracteres, rol permitido y estado booleano opcional.
 */
export const createUserValidator = [
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
    .custom((role) => {
      if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`El rol "${role}" no es válido. Permitidos: ${ALLOWED_ROLES.join(', ')}`);
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

/**
 * Reglas de validación para la actualización parcial o total de un usuario existente (`PUT /api/v1/usuarios/:id`).
 */
export const updateUserValidator = [
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
    .custom((role) => {
      if (!ALLOWED_ROLES.includes(role)) {
        throw new Error(`El rol "${role}" no es válido. Permitidos: ${ALLOWED_ROLES.join(', ')}`);
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

/**
 * Reglas de validación para activar o desactivar un usuario (`PATCH /api/v1/usuarios/:id/estado`).
 */
export const changeUserStatusValidator = [
  body('estado')
    .exists({ checkNull: false })
    .withMessage('El campo "estado" es obligatorio y debe ser un booleano (true o false)')
    .isBoolean()
    .withMessage('El campo "estado" es obligatorio y debe ser un booleano (true o false)')
];

/**
 * Reglas de validación para el cambio de contraseña del usuario autenticado.
 * Exige la contraseña actual y valida que la nueva tenga al menos 6 caracteres y sea diferente a la actual.
 */
export const changePasswordValidator = [
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
  createUserValidator,
  updateUserValidator,
  changeUserStatusValidator,
  changePasswordValidator
};
