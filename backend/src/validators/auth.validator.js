import { body } from 'express-validator';

/**
 * Validador para inicio de sesión
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

export const validateLogin = loginValidator;

export default {
  loginValidator,
  validateLogin
};
