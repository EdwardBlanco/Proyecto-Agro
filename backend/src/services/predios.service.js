import AppError from '../shared/errors/AppError.js';
import { Predio } from '../models/Predio.model.js';

/**
 * Crea un nuevo predio en el sistema
 */
export const crearPredio = async ({ nombre, ubicacion, latitud, longitud, area_m2, estado }) => {
  const predio = new Predio({
    nombre: nombre.trim(),
    ubicacion: ubicacion.trim(),
    latitud,
    longitud,
    area_m2,
    estado: estado !== undefined ? estado : true
  });

  await predio.save();

  return predio.toJSON();
};

/**
 * Lista predios con soporte de paginación y filtros
 */
export const listarPredios = async ({ estado, q, page = 1, limit = 10 } = {}) => {
  const query = {};

  if (estado !== undefined) {
    query.estado = estado === 'true' || estado === true;
  }

  if (q && typeof q === 'string') {
    const regex = new RegExp(q.trim(), 'i');
    query.$or = [{ nombre: regex }, { ubicacion: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [predios, total] = await Promise.all([
    Predio.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum),
    Predio.countDocuments(query)
  ]);

  return {
    predios: predios.map((p) => p.toJSON()),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

/**
 * Obtiene un predio por su ID
 */
export const obtenerPredioPorId = async (id) => {
  const predio = await Predio.findById(id);
  if (!predio) {
    throw new AppError('Predio no encontrado', 404);
  }
  return predio.toJSON();
};

/**
 * Actualiza los datos de un predio
 */
export const actualizarPredio = async (id, datos) => {
  const predio = await Predio.findById(id);
  if (!predio) {
    throw new AppError('Predio no encontrado', 404);
  }

  if (datos.nombre !== undefined) {
    predio.nombre = datos.nombre.trim();
  }

  if (datos.ubicacion !== undefined) {
    predio.ubicacion = datos.ubicacion.trim();
  }

  if (datos.latitud !== undefined) {
    predio.latitud = datos.latitud;
  }

  if (datos.longitud !== undefined) {
    predio.longitud = datos.longitud;
  }

  if (datos.area_m2 !== undefined) {
    predio.area_m2 = datos.area_m2;
  }

  if (datos.estado !== undefined) {
    predio.estado = datos.estado;
  }

  await predio.save();

  return predio.toJSON();
};

/**
 * Cambia el estado (activo/inactivo) lógico de un predio
 */
export const cambiarEstado = async (id, estado) => {
  const predio = await Predio.findById(id);
  if (!predio) {
    throw new AppError('Predio no encontrado', 404);
  }

  predio.estado = Boolean(estado);
  await predio.save();

  return predio.toJSON();
};

export default {
  crearPredio,
  listarPredios,
  obtenerPredioPorId,
  actualizarPredio,
  cambiarEstado
};
