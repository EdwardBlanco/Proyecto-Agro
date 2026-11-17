import config from '../config/env.js';
import AppError from '../shared/errors/AppError.js';

/**
 * Middleware centralizado de manejo de errores HTTP.
 * Normaliza errores operacionales (AppError), de Mongoose, de sintaxis JSON y de JWT en una respuesta uniforme.
 * @param {Error & { statusCode?: number, status?: string, code?: number, keyValue?: Object, errors?: Object, details?: any, path?: string }} err - Error capturado
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @param {import('express').NextFunction} next - Función next de Express
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.status = err.status || (error.statusCode >= 500 ? 'error' : 'fail');

  // Mongoose: CastError (ej. ID de Mongo inválido)
  if (err.name === 'CastError') {
    const message = `Recurso no encontrado. Parámetro inválido: ${err.path}`;
    error = new AppError(message, 400);
  }

  // Mongoose: Duplicate Key Error (código 11000 por índice único)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    const message = `Valor duplicado en el campo: ${fields}`;
    error = new AppError(message, 409, err.keyValue);
  }

  // Mongoose: ValidationError (fallo en validaciones del esquema)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(el => el.message);
    const message = `Datos de entrada no válidos: ${errors.join('. ')}`;
    error = new AppError(message, 400, errors);
  }

  // Error de sintaxis en el cuerpo JSON enviado por el cliente
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = new AppError('JSON mal formado en la solicitud', 400);
  }

  // JWT: Token inválido o mal formado
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Token de autenticación no válido', 401);
  }

  // JWT: Token expirado
  if (err.name === 'TokenExpiredError') {
    error = new AppError('El token de autenticación ha expirado', 401);
  }

  const responsePayload = {
    status: error.status,
    statusCode: error.statusCode,
    message: error.message || 'Error interno del servidor',
    mensaje: error.message || 'Error interno del servidor'
  };

  if (error.details) {
    responsePayload.details = error.details;
  }

  // Exponer stack trace únicamente en entorno de desarrollo
  if (config.nodeEnv === 'development' && err.stack) {
    responsePayload.stack = err.stack;
  }

  // Registro de errores internos en consola cuando el código es 500 o superior (fuera de pruebas)
  if (error.statusCode >= 500 && config.nodeEnv !== 'test') {
    console.error('[Error Handler]', err);
  }

  return res.status(error.statusCode).json(responsePayload);
};

export default errorHandler;
