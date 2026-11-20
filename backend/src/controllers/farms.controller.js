import farmsService from '../services/farms.service.js';
import { sendSuccess, sendCreated } from '../shared/http/response.js';

/**
 * Controlador para crear un nuevo predio agrícola en el sistema.
 */
export const createFarm = async (req, res, next) => {
  try {
    const { nombre, ubicacion, latitud, longitud, area_m2, estado, responsable } = req.body;
    const farm = await farmsService.createFarm({ nombre, ubicacion, latitud, longitud, area_m2, estado, responsable });
    return sendCreated(res, farm, 'Predio creado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para listar predios con soporte de paginación y filtros por estado o texto.
 */
export const listFarms = async (req, res, next) => {
  try {
    const { estado, q, page, limit } = req.query;
    const result = await farmsService.listFarms({ estado, q, page, limit });
    return sendSuccess(res, result, 'Listado de predios obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para obtener el detalle de un predio por su ID.
 */
export const getFarmById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const farm = await farmsService.getFarmById(id);
    return sendSuccess(res, farm, 'Predio obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para actualizar los datos de un predio existente.
 */
export const updateFarm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, latitud, longitud, area_m2, estado, responsable } = req.body;
    const farm = await farmsService.updateFarm(id, { nombre, ubicacion, latitud, longitud, area_m2, estado, responsable });
    return sendSuccess(res, farm, 'Predio actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Controlador para activar o desactivar lógicamente un predio.
 */
export const changeFarmStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const farm = await farmsService.changeFarmStatus(id, estado);
    return sendSuccess(res, farm, 'Estado del predio actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  createFarm,
  listFarms,
  getFarmById,
  updateFarm,
  changeFarmStatus
};
