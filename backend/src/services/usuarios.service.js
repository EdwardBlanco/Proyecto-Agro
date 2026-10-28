import AppError from '../shared/errors/AppError.js';
import { Usuario } from '../models/Usuario.model.js';

/**
 * Crea un nuevo usuario en el sistema
 */
export const crearUsuario = async ({ nombre, correo, contrasena, rol, estado }) => {
  const correoNormalizado = correo.toLowerCase().trim();

  // Validar si el correo ya existe
  const usuarioExistente = await Usuario.findOne({ correo: correoNormalizado });
  if (usuarioExistente) {
    throw new AppError('El correo electrónico ya se encuentra registrado', 409, { correo });
  }

  const usuario = new Usuario({
    nombre: nombre.trim(),
    correo: correoNormalizado,
    contrasena_hash: contrasena,
    rol: rol || 'operario',
    estado: estado !== undefined ? estado : true
  });

  await usuario.save();

  return usuario.toJSON();
};

/**
 * Lista usuarios con soporte de filtros y paginación
 */
export const listarUsuarios = async ({ rol, estado, q, page = 1, limit = 10 } = {}) => {
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

  const [usuarios, total] = await Promise.all([
    Usuario.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum),
    Usuario.countDocuments(query)
  ]);

  return {
    usuarios: usuarios.map((u) => u.toJSON()),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

/**
 * Obtiene un usuario por su ID
 */
export const obtenerUsuarioPorId = async (id) => {
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }
  return usuario.toJSON();
};

/**
 * Actualiza los datos de un usuario
 */
export const actualizarUsuario = async (id, datos) => {
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (datos.correo) {
    const correoNormalizado = datos.correo.toLowerCase().trim();
    if (correoNormalizado !== usuario.correo) {
      const correoEnUso = await Usuario.findOne({
        correo: correoNormalizado,
        _id: { $ne: id }
      });

      if (correoEnUso) {
        throw new AppError('El correo electrónico ya está en uso por otro usuario', 409, { correo: datos.correo });
      }
      usuario.correo = correoNormalizado;
    }
  }

  if (datos.nombre) {
    usuario.nombre = datos.nombre.trim();
  }

  if (datos.rol) {
    usuario.rol = datos.rol;
  }

  if (datos.estado !== undefined) {
    usuario.estado = datos.estado;
  }

  await usuario.save();

  return usuario.toJSON();
};

/**
 * Cambia el estado (activo/inactivo) de un usuario
 */
export const cambiarEstado = async (id, estado) => {
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  usuario.estado = Boolean(estado);
  await usuario.save();

  return usuario.toJSON();
};

/**
 * Permite al usuario autenticado cambiar su contraseña de manera segura
 */
export const cambiarContrasena = async (usuarioId, contrasenaActual, contrasenaNueva) => {
  const usuario = await Usuario.findById(usuarioId).select('+contrasena_hash');
  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const coincide = await usuario.compararContrasena(contrasenaActual);
  if (!coincide) {
    throw new AppError('La contraseña actual es incorrecta', 400);
  }

  usuario.contrasena_hash = contrasenaNueva;
  await usuario.save();

  return { message: 'Contraseña actualizada exitosamente' };
};

export default {
  crearUsuario,
  listarUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  cambiarEstado,
  cambiarContrasena
};
