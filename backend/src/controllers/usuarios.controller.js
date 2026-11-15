import usuariosService from '../services/usuarios.service.js';
import { sendSuccess, sendCreated } from '../shared/http/response.js';

/**
 * Crear un nuevo usuario
 */
export const crearUsuario = async (req, res, next) => {
  try {
    const { nombre, correo, contrasena, rol, estado } = req.body;
    const usuario = await usuariosService.crearUsuario({ nombre, correo, contrasena, rol, estado });
    return sendCreated(res, usuario, 'Usuario creado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Listar usuarios con paginación y filtros
 */
export const listarUsuarios = async (req, res, next) => {
  try {
    const { rol, estado, q, page, limit } = req.query;
    const resultado = await usuariosService.listarUsuarios({ rol, estado, q, page, limit });
    return sendSuccess(res, resultado, 'Listado de usuarios obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un usuario por ID
 */
export const obtenerUsuarioPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const usuario = await usuariosService.obtenerUsuarioPorId(id);
    return sendSuccess(res, usuario, 'Usuario obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar datos de un usuario
 */
export const actualizarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, estado } = req.body;
    const usuario = await usuariosService.actualizarUsuario(id, { nombre, correo, rol, estado });
    return sendSuccess(res, usuario, 'Usuario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Activar o desactivar lógicamente un usuario
 */
export const cambiarEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuario = await usuariosService.cambiarEstado(id, estado);
    return sendSuccess(res, usuario, 'Estado del usuario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Cambiar contraseña del usuario autenticado
 */
export const cambiarContrasena = async (req, res, next) => {
  try {
    const user = req.user || req.usuario;
    const usuarioId = user._id || user.id;
    const { contrasena_actual, contrasena_nueva } = req.body;
    const resultado = await usuariosService.cambiarContrasena(usuarioId, contrasena_actual, contrasena_nueva);
    return sendSuccess(res, resultado, 'Contraseña actualizada exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  crearUsuario,
  listarUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  cambiarEstado,
  cambiarContrasena
};
