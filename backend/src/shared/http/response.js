/**
 * Utilidades para estandarizar las respuestas HTTP de la API
 */

export const sendSuccess = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
  const payload = {
    status: 'success',
    message
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

export const sendCreated = (res, data = null, message = 'Recurso creado exitosamente') => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (res, message = 'Error interno del servidor', statusCode = 500, details = null) => {
  const payload = {
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    statusCode,
    message
  };

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};

export default {
  sendSuccess,
  sendCreated,
  sendError
};
