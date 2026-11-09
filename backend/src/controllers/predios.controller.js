import prediosService from '../services/predios.service.js';
import { sendSuccess, sendCreated } from '../shared/http/response.js';

/**
 * Crear un nuevo predio
 */
export const crearPredio = async (req, res, next) => {
  try {
    const { nombre, ubicacion, latitud, longitud, area_m2, estado } = req.body;
    const predio = await prediosService.crearPredio({ nombre, ubicacion, latitud, longitud, area_m2, estado });
    return sendCreated(res, predio, 'Predio creado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Listar predios con paginación y filtros
 */
export const listarPredios = async (req, res, next) => {
  try {
    const { estado, q, page, limit } = req.query;
    const resultado = await prediosService.listarPredios({ estado, q, page, limit });
    return sendSuccess(res, resultado, 'Listado de predios obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener un predio por ID
 */
export const obtenerPredioPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const predio = await prediosService.obtenerPredioPorId(id);
    return sendSuccess(res, predio, 'Predio obtenido exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar datos de un predio
 */
export const actualizarPredio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, latitud, longitud, area_m2, estado } = req.body;
    const predio = await prediosService.actualizarPredio(id, { nombre, ubicacion, latitud, longitud, area_m2, estado });
    return sendSuccess(res, predio, 'Predio actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

/**
 * Activar o desactivar lógicamente un predio
 */
export const cambiarEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const predio = await prediosService.cambiarEstado(id, estado);
    return sendSuccess(res, predio, 'Estado del predio actualizado exitosamente');
  } catch (error) {
    next(error);
  }
};

export default {
  crearPredio,
  listarPredios,
  obtenerPredioPorId,
  actualizarPredio,
  cambiarEstado
};
