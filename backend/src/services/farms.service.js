import {
  changeMockFarmStatus,
  createMockFarm,
  findMockFarmById,
  isMockDbMode,
  listMockFarms,
  serializeMockFarm,
  updateMockFarm
} from '../config/mockStore.js';
import AppError from '../shared/errors/AppError.js';
import { Farm } from '../models/Farm.model.js';

/**
 * Crea un nuevo predio en el sistema y lo persiste en MongoDB.
 *
 * @param {Object} farmData - Datos del predio a registrar
 * @param {string} farmData.nombre - Nombre del predio
 * @param {string} farmData.ubicacion - Ubicación geográfica o dirección
 * @param {number} farmData.latitud - Latitud en rango [-90, 90]
 * @param {number} farmData.longitud - Longitud en rango [-180, 180]
 * @param {number} farmData.area_m2 - Área total en metros cuadrados
 * @param {boolean} [farmData.estado=true] - Estado lógico inicial del predio
 * @returns {Promise<object>} Predio creado serializado a JSON
 */
export const createFarm = async ({ nombre, ubicacion, latitud, longitud, area_m2, estado, responsable }) => {
  if (isMockDbMode()) {
    return createMockFarm({ nombre, ubicacion, latitud, longitud, area_m2, estado, responsable });
  }

  const farm = new Farm({
    nombre: nombre.trim(),
    ubicacion: ubicacion.trim(),
    latitud,
    longitud,
    responsable,
    area_m2,
    estado: estado !== undefined ? estado : true
  });

  await farm.save();

  return farm.toJSON();
};

/**
 * Lista predios con soporte de paginación y filtros por estado y texto de búsqueda.
 *
 * @param {Object} [filters] - Criterios de búsqueda y paginación
 * @param {boolean|string} [filters.estado] - Filtro por estado activo/inactivo
 * @param {string} [filters.q] - Término de búsqueda sobre nombre o ubicación
 * @param {number|string} [filters.page=1] - Número de página actual
 * @param {number|string} [filters.limit=10] - Cantidad de registros por página (máximo 100)
 * @returns {Promise<{predios: object[], total: number, page: number, limit: number, totalPages: number}>} Resultado paginado
 */
export const listFarms = async ({ estado, q, page = 1, limit = 10 } = {}) => {
  if (isMockDbMode()) {
    return listMockFarms({ estado, q, page, limit });
  }

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

  const [farms, total] = await Promise.all([
    Farm.find(query)
      .select('-__v')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Farm.countDocuments(query)
  ]);

  return {
    predios: farms,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

/**
 * Obtiene un predio por su identificador único de MongoDB.
 *
 * @param {string} id - Identificador del predio
 * @returns {Promise<object>} Predio encontrado en formato JSON
 */
export const getFarmById = async (id) => {
  if (isMockDbMode()) {
    const mockFarm = findMockFarmById(id);
    if (!mockFarm) {
      throw new AppError('Predio no encontrado', 404);
    }
    return serializeMockFarm(mockFarm);
  }

  const farm = await Farm.findById(id);
  if (!farm) {
    throw new AppError('Predio no encontrado', 404);
  }
  return farm.toJSON();
};

/**
 * Actualiza parcialmente los datos de un predio existente.
 *
 * @param {string} id - Identificador del predio a actualizar
 * @param {Object} data - Campos a modificar del predio
 * @returns {Promise<object>} Predio actualizado en formato JSON
 */
export const updateFarm = async (id, data) => {
  if (isMockDbMode()) {
    return updateMockFarm(id, data);
  }

  const farm = await Farm.findById(id);
  if (!farm) {
    throw new AppError('Predio no encontrado', 404);
  }

  if (data.nombre !== undefined) {
    farm.nombre = data.nombre.trim();
  }

  if (data.ubicacion !== undefined) {
    farm.ubicacion = data.ubicacion.trim();
  }

  if (data.latitud !== undefined) {
    farm.latitud = data.latitud;
  }

  if (data.longitud !== undefined) {
    farm.longitud = data.longitud;
  }

  if (data.responsable !== undefined) {
    farm.responsable = data.responsable;
  }

  if (data.area_m2 !== undefined) {
    farm.area_m2 = data.area_m2;
  }

  if (data.estado !== undefined) {
    farm.estado = data.estado;
  }

  await farm.save();

  return farm.toJSON();
};

/**
 * Cambia el estado lógico (activo/inactivo) de un predio.
 *
 * @param {string} id - Identificador del predio
 * @param {boolean} estado - Nuevo estado operativo del predio
 * @returns {Promise<object>} Predio con el estado actualizado en formato JSON
 */
export const changeFarmStatus = async (id, estado) => {
  if (isMockDbMode()) {
    return changeMockFarmStatus(id, estado);
  }

  const farm = await Farm.findById(id);
  if (!farm) {
    throw new AppError('Predio no encontrado', 404);
  }

  farm.estado = Boolean(estado);
  await farm.save();

  return farm.toJSON();
};

export default {
  createFarm,
  listFarms,
  getFarmById,
  updateFarm,
  changeFarmStatus
};
