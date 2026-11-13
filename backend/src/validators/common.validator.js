import { param } from 'express-validator';

/**
 * Validador para parámetro :id en URL (debe ser un ObjectId válido de MongoDB)
 */
export const idValidator = [
  param('id')
    .isMongoId()
    .withMessage('El id proporcionado no es un ObjectId válido de MongoDB')
];

export default {
  idValidator
};
