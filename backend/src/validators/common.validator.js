import { param } from 'express-validator';

/**
 * Validador reutilizable para el parámetro de ruta `:id`.
 * Verifica que corresponda a un ObjectId válido de MongoDB antes de consultar la base de datos.
 */
export const idValidator = [
  param('id')
    .isMongoId()
    .withMessage('El id proporcionado no es un ObjectId válido de MongoDB')
];

export default {
  idValidator
};
