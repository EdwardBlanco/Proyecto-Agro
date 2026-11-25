import AppError from '../shared/errors/AppError.js';
import { User } from '../models/User.model.js';

/**
 * Crea un nuevo usuario en el sistema verificando que el correo no esté duplicado.
 *
 * @param {Object} userData - Datos del usuario a crear
 * @param {string} userData.nombre - Nombre completo del usuario
 * @param {string} userData.correo - Correo electrónico único
 * @param {string} userData.contrasena - Contraseña en texto plano (se encripta en el hook pre-save de User)
 * @param {string} [userData.rol='operario'] - Rol asignado dentro del sistema
 * @param {boolean} [userData.estado=true] - Estado activo/inactivo inicial
 * @returns {Promise<object>} Usuario creado en formato JSON
 */
export const createUser = async ({ nombre, correo, contrasena, rol, estado }) => {
  const normalizedEmail = correo.toLowerCase().trim();

  // Validar si el correo ya existe antes de crear el documento
  const existingUser = await User.findOne({ correo: normalizedEmail });
  if (existingUser) {
    throw new AppError('El correo electrónico ya se encuentra registrado', 409, { correo });
  }

  const user = new User({
    nombre: nombre.trim(),
    correo: normalizedEmail,
    contrasena_hash: contrasena,
    rol: rol || 'operario',
    estado: estado !== undefined ? estado : true
  });

  await user.save();

  return user.toJSON();
};

/**
 * Lista usuarios con soporte de filtros por rol, estado, texto de búsqueda y paginación.
 *
 * @param {Object} [filters] - Parámetros de filtrado y paginación
 * @param {string} [filters.rol] - Filtro por rol del usuario
 * @param {boolean|string} [filters.estado] - Filtro por estado activo/inactivo
 * @param {string} [filters.q] - Término de búsqueda sobre nombre o correo
 * @param {number|string} [filters.page=1] - Número de página
 * @param {number|string} [filters.limit=10] - Límite de registros por página (máximo 100)
 * @returns {Promise<{usuarios: object[], total: number, page: number, limit: number, totalPages: number}>} Listado paginado
 */
export const listUsers = async ({ rol, estado, q, page = 1, limit = 10 } = {}) => {
  const query = {};

  if (rol) {
    query.rol = rol;
  }

  if (estado !== undefined) {
    query.estado = estado === 'true' || estado === true;
  }

  if (q && typeof q === 'string') {
    const regex = new RegExp(q.trim(), 'i');
    query.$or = [{ nombre: regex }, { correo: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(query)
  ]);

  return {
    usuarios: users.map((u) => u.toJSON()),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

/**
 * Obtiene un usuario por su identificador único de MongoDB.
 *
 * @param {string} id - Identificador del usuario
 * @returns {Promise<object>} Usuario encontrado en formato JSON
 */
export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return user.toJSON();
};

/**
 * Actualiza los datos de un usuario existente validando unicidad de correo si cambia.
 *
 * @param {string} id - Identificador del usuario a actualizar
 * @param {Object} data - Campos a modificar
 * @returns {Promise<object>} Usuario actualizado en formato JSON
 */
export const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (data.correo) {
    const normalizedEmail = data.correo.toLowerCase().trim();
    if (normalizedEmail !== user.correo) {
      const emailInUse = await User.findOne({
        correo: normalizedEmail,
        _id: { $ne: id }
      });

      if (emailInUse) {
        throw new AppError('El correo electrónico ya está en uso por otro usuario', 409, { correo: data.correo });
      }
      user.correo = normalizedEmail;
    }
  }

  if (data.nombre) {
    user.nombre = data.nombre.trim();
  }

  if (data.rol) {
    user.rol = data.rol;
  }

  if (data.estado !== undefined) {
    user.estado = data.estado;
  }

  await user.save();

  return user.toJSON();
};

/**
 * Cambia el estado lógico (activo/inactivo) de un usuario.
 *
 * @param {string} id - Identificador del usuario
 * @param {boolean} estado - Nuevo estado del usuario
 * @returns {Promise<object>} Usuario con estado actualizado en formato JSON
 */
export const changeUserStatus = async (id, estado) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  user.estado = Boolean(estado);
  await user.save();

  return user.toJSON();
};

/**
 * Permite al usuario autenticado cambiar su contraseña verificando primero la contraseña actual.
 *
 * @param {string} userId - Identificador del usuario autenticado
 * @param {string} currentPassword - Contraseña actual en texto plano
 * @param {string} newPassword - Nueva contraseña en texto plano
 * @returns {Promise<{message: string}>} Mensaje de confirmación
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
  // Se incluye contrasena_hash para comparar la contraseña actual mediante el método del modelo
  const user = await User.findById(userId).select('+contrasena_hash');
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw new AppError('La contraseña actual es incorrecta', 400);
  }

  user.contrasena_hash = newPassword;
  await user.save();

  return { message: 'Contraseña actualizada exitosamente' };
};

export default {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  changeUserStatus,
  changePassword
};
