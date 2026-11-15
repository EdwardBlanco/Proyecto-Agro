import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { Usuario } from '../models/Usuario.model.js';
import AppError from '../shared/errors/AppError.js';

/**
 * Genera un token JWT firmado con el ID de usuario
 * @param {string} uid
 * @returns {Promise<string>}
 */
export const generarJWT = (uid) => {
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
          console.error('[validar-jwt] Error al generar token:', err);
          reject('No se pudo generar el token');
        } else {
          resolve(token);
        }
      }
    );
  });
};

/**
 * Middleware para validar el token JWT proveniente de la cabecera x-token o Authorization: Bearer
 */
export const validarJWT = async (req, res, next) => {
  let token = req.header('x-token');

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

    const usuario = await Usuario.findById(uid);
    if (!usuario) {
      return res.status(401).json({
        status: 'fail',
        msg: 'Token no válido - usuario no existe en DB',
        message: 'El usuario correspondiente a este token ya no existe'
      });
    }

    if (!usuario.estado) {
      return res.status(401).json({
        status: 'fail',
        msg: 'Token no válido - usuario inactivo',
        message: 'El usuario se encuentra inactivo. Acceso denegado'
      });
    }

    // Inyectar usuario en la petición (tanto req.usuario según guía como req.user para tests)
    req.usuario = usuario;
    req.user = usuario;

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

export const authenticate = validarJWT;

export default validarJWT;
