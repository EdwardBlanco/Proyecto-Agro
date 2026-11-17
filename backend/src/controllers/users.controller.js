import usersService from '../services/users.service.js';
import { sendSuccess, sendCreated } from '../shared/http/response.js';

/**
 * Controlador para crear un nuevo usuario en el sistema.
 */
export const createUser = async (req, res, next) => {
  try {
    const { nombre, correo, contrasena, rol, estado } = req.body;
    const user = await usersService.createUser({ nombre, correo, contrasena, rol, estado });
    return sendCreated(res, user, 'Usuario creado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para listar usuarios con soporte de paginación y filtros por rol, estado o texto.
 */
export const listUsers = async (req, res, next) => {
  try {
    const { rol, estado, q, page, limit } = req.query;
    const result = await usersService.listUsers({ rol, estado, q, page, limit });
    return sendSuccess(res, result, 'Listado de usuarios obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener el detalle de un usuario por su ID.
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await usersService.getUserById(id);
    return sendSuccess(res, user, 'Usuario obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para actualizar los datos de un usuario existente.
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, correo, rol, estado } = req.body;
    const user = await usersService.updateUser(id, { nombre, correo, rol, estado });
    return sendSuccess(res, user, 'Usuario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para activar o desactivar lógicamente un usuario.
 */
export const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const user = await usersService.changeUserStatus(id, estado);
    return sendSuccess(res, user, 'Estado del usuario actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para cambiar la contraseña del usuario autenticado actualmente.
 */
export const changePassword = async (req, res, next) => {
  try {
    const authenticatedUser = req.user || req.usuario;
    const userId = authenticatedUser._id || authenticatedUser.id;
    const { contrasena_actual, contrasena_nueva } = req.body;
    const result = await usersService.changePassword(userId, contrasena_actual, contrasena_nueva);
    return sendSuccess(res, result, 'Contraseña actualizada exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  changePassword
};
