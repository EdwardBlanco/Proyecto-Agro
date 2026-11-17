import { body } from 'express-validator';

/**
 * Reglas de validación para el inicio de sesión (`POST /api/v1/auth/login`).
 * Verifica que `correo` tenga formato válido y que `contrasena` no esté vacía.
 */
export const loginValidator = [
  body('correo')
    .trim()
    .notEmpty()
    .withMessage('El campo "correo" es obligatorio')
    .isEmail()
    .withMessage('El formato del correo electrónico no es válido'),
  body('contrasena')
    .notEmpty()
    .withMessage('El campo "contrasena" es obligatorio')
];

// Alias para compatibilidad con rutas que importan validateLogin
export const validateLogin = loginValidator;

export default {
  loginValidator,
  validateLogin
};
