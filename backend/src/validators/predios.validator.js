import { body } from 'express-validator';

export const crearPredioValidator = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El campo "nombre" es obligatorio')
    .isLength({ max: 120 })
    .withMessage('El campo "nombre" no puede superar 120 caracteres'),
  body('ubicacion')
    .trim()
    .notEmpty()
    .withMessage('El campo "ubicacion" es obligatorio')
    .isLength({ max: 200 })
    .withMessage('El campo "ubicacion" no puede superar 200 caracteres'),
  body('latitud')
    .exists({ checkNull: false })
    .withMessage('El campo "latitud" es obligatorio y debe ser un número válido')
    .isFloat()
    .withMessage('El campo "latitud" es obligatorio y debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < -90 || num > 90) {
        throw new Error('La latitud debe estar comprendida en el rango [-90, 90]');
      }
      return true;
    }),
  body('longitud')
    .exists({ checkNull: false })
    .withMessage('El campo "longitud" es obligatorio y debe ser un número válido')
    .isFloat()
    .withMessage('El campo "longitud" es obligatorio y debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < -180 || num > 180) {
        throw new Error('La longitud debe estar comprendida en el rango [-180, 180]');
      }
      return true;
    }),
  body('area_m2')
    .exists({ checkNull: false })
    .withMessage('El campo "area_m2" es obligatorio y debe ser un número válido')
    .isFloat()
    .withMessage('El campo "area_m2" es obligatorio y debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < 0) {
        throw new Error('El área en m2 debe ser un valor mayor o igual a 0');
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

export const actualizarPredioValidator = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El campo "nombre" debe ser un texto válido')
    .isLength({ max: 120 })
    .withMessage('El campo "nombre" no puede superar 120 caracteres'),
  body('ubicacion')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El campo "ubicacion" debe ser un texto válido')
    .isLength({ max: 200 })
    .withMessage('El campo "ubicacion" no puede superar 200 caracteres'),
  body('latitud')
    .optional()
    .isFloat()
    .withMessage('El campo "latitud" debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < -90 || num > 90) {
        throw new Error('La latitud debe estar comprendida en el rango [-90, 90]');
      }
      return true;
    }),
  body('longitud')
    .optional()
    .isFloat()
    .withMessage('El campo "longitud" debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < -180 || num > 180) {
        throw new Error('La longitud debe estar comprendida en el rango [-180, 180]');
      }
      return true;
    }),
  body('area_m2')
    .optional()
    .isFloat()
    .withMessage('El campo "area_m2" debe ser un número válido')
    .custom((val) => {
      const num = Number(val);
      if (num < 0) {
        throw new Error('El área en m2 debe ser un valor mayor o igual a 0');
      }
      return true;
    }),
  body('estado')
    .optional()
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

export const cambiarEstadoPredioValidator = [
  body('estado')
    .exists({ checkNull: false })
    .withMessage('El campo "estado" es obligatorio y debe ser un booleano (true o false)')
    .isBoolean()
    .withMessage('El campo "estado" debe ser un booleano (true o false)')
];

export default {
  crearPredioValidator,
  actualizarPredioValidator,
  cambiarEstadoPredioValidator
};
