import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { User } from '../models/User.model.js';

/**
 * Genera un token JWT firmado con el ID del usuario.
 * Incluye las claves uid, id y usuario_id en el payload para compatibilidad con consumidores existentes.
 * @param {string} uid - Identificador único del usuario en MongoDB
 * @returns {Promise<string>} Token JWT firmado
 */
export const generateJwt = (uid) => {
  return new Promise((resolve, reject) => {
    const payload = {
      uid,
      id: uid,
      usuario_id: uid
    };
    const secret = config.jwtSecret;
    const expiresIn = config.jwtExpiresIn || '4h';

    jwt.sign(
      payload,
      secret,
      { expiresIn },
      (err, token) => {
        if (err) {
          console.error('[validateJwt] Error al generar token:', err);
          reject('No se pudo generar el token');
        } else {
          resolve(token);
        }
      }
    );
  });
};

/**
 * Middleware de autenticación que valida el token JWT recibido en la cabecera `x-token` o `Authorization: Bearer`.
 * Verifica que el usuario exista y esté activo en la base de datos antes de continuar.
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @param {import('express').NextFunction} next - Función para continuar al siguiente middleware
 */
export const validateJwt = async (req, res, next) => {
  let token = req.header('x-token');

  // Si no viene en x-token, extraerlo desde Authorization (formato Bearer o token plano)
  if (!token && req.headers.authorization) {
    if (req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else {
      token = req.headers.authorization;
    }
  }

  if (!token) {
    return res.status(401).json({
      status: 'fail',
      msg: 'No hay token en la peticion',
      message: 'Acceso denegado. No se proporcionó token de autenticación'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const uid = decoded.uid || decoded.id || decoded.usuario_id || decoded.sub;

    const user = await User.findById(uid);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        msg: 'Token no válido - usuario no existe en DB',
        message: 'El usuario correspondiente a este token ya no existe'
      });
    }

    if (!user.estado) {
      return res.status(401).json({
        status: 'fail',
        msg: 'Token no válido - usuario inactivo',
        message: 'El usuario se encuentra inactivo. Acceso denegado'
      });
    }

    // Inyectar usuario autenticado en la petición (req.usuario y req.user por compatibilidad con controladores y tests)
    req.usuario = user;
    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      msg: 'Token no valido',
      message: error.name === 'TokenExpiredError'
        ? 'El token de autenticación ha expirado'
        : 'Token de autenticación no válido'
    });
  }
};

// Alias estándar en inglés para el middleware de autenticación
export const authenticate = validateJwt;

export default validateJwt;
