import mongoose from 'mongoose';
import config from './env.js';
import { getDatabaseStatus } from './db.js';
import AppError from '../shared/errors/AppError.js';

const nowIso = () => new Date().toISOString();

const initialMockUsers = [
  {
    _id: '507f1f77bcf86cd799439011',
    nombre: 'Laura Mendoza',
    correo: 'admin@agrogestion.demo',
    contrasena_plain: 'Agro2026!',
    rol: 'administrador',
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  },
  {
    _id: '507f1f77bcf86cd799439012',
    nombre: 'Carlos Ríos',
    correo: 'superadmin@agrogestion.demo',
    contrasena_plain: 'Agro2026!',
    rol: 'superadmin',
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  },
  {
    _id: '507f1f77bcf86cd799439013',
    nombre: 'María Torres',
    correo: 'maria@agrogestion.demo',
    contrasena_plain: 'Agro2026!',
    rol: 'operario',
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  },
  {
    _id: '507f1f77bcf86cd799439014',
    nombre: 'José Pérez',
    correo: 'operario@agrogestion.demo',
    contrasena_plain: 'Agro2026!',
    rol: 'operario',
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  }
];

const initialMockFarms = [
  {
    _id: '507f1f77bcf86cd799439021',
    nombre: 'El Robledal',
    ubicacion: 'Rionegro, Antioquia',
    latitud: 6.1552,
    longitud: -75.3737,
    area_m2: 240000,
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  },
  {
    _id: '507f1f77bcf86cd799439022',
    nombre: 'La Esperanza',
    ubicacion: 'La Ceja, Antioquia',
    latitud: 6.0319,
    longitud: -75.4316,
    area_m2: 180000,
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z'
  }
];

const mockUsers = initialMockUsers.map((u) => ({ ...u }));
const mockFarms = initialMockFarms.map((f) => ({ ...f }));

/**
 * Indica si el backend debe operar sobre el almacén en memoria (mock) por no tener
 * una conexión activa a MongoDB fuera del entorno de pruebas automatizadas.
 */
export const isMockDbMode = () => {
  return config.nodeEnv !== 'test' && getDatabaseStatus() !== 'connected';
};

export const serializeMockUser = (user) => {
  if (!user) return null;
  const { contrasena_plain, ...publicFields } = user;
  void contrasena_plain;
  return { ...publicFields };
};

export const serializeMockFarm = (farm) => {
  if (!farm) return null;
  return { ...farm };
};

export const findMockUserByEmail = (correo) => {
  const normalized = String(correo ?? '').trim().toLowerCase();
  return mockUsers.find((u) => u.correo.toLowerCase() === normalized) || null;
};

export const findMockUserById = (id) => {
  const target = String(id ?? '').trim();
  return mockUsers.find((u) => String(u._id) === target) || null;
};

export const createMockUser = ({ nombre, correo, contrasena, rol, estado, predios_asignados = [] }) => {
  const normalizedEmail = correo.toLowerCase().trim();
  if (findMockUserByEmail(normalizedEmail)) {
    throw new AppError('El correo electrónico ya se encuentra registrado', 409, { correo });
  }

  const timestamp = nowIso();
  const newUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    nombre: nombre.trim(),
    correo: normalizedEmail,
    contrasena_plain: contrasena || 'Agro2026!',
    rol: rol || 'operario',
    predios_asignados,
    estado: estado !== undefined ? Boolean(estado) : true,
    created_at: timestamp,
    updated_at: timestamp
  };

  mockUsers.unshift(newUser);
  return serializeMockUser(newUser);
};

export const listMockUsers = ({ rol, estado, q, page = 1, limit = 10 } = {}) => {
  let filtered = [...mockUsers];

  if (rol) {
    filtered = filtered.filter((u) => u.rol === rol);
  }

  if (estado !== undefined) {
    const active = estado === 'true' || estado === true;
    filtered = filtered.filter((u) => u.estado === active);
  }

  if (q && typeof q === 'string') {
    const regex = new RegExp(q.trim(), 'i');
    filtered = filtered.filter((u) => regex.test(u.nombre) || regex.test(u.correo));
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const total = filtered.length;
  const paged = filtered.slice(skip, skip + limitNum).map(serializeMockUser);

  return {
    usuarios: paged,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

export const updateMockUser = (id, data) => {
  const user = findMockUserById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (data.correo) {
    const normalizedEmail = data.correo.toLowerCase().trim();
    if (normalizedEmail !== user.correo) {
      const existing = findMockUserByEmail(normalizedEmail);
      if (existing && String(existing._id) !== String(id)) {
        throw new AppError('El correo electrónico ya está en uso por otro usuario', 409, { correo: data.correo });
      }
      user.correo = normalizedEmail;
    }
  }

  if (data.nombre) user.nombre = data.nombre.trim();
  if (data.rol) user.rol = data.rol;
  if (data.estado !== undefined) user.estado = Boolean(data.estado);
  if (data.predios_asignados !== undefined) user.predios_asignados = data.predios_asignados;
  user.updated_at = nowIso();

  return serializeMockUser(user);
};

export const changeMockUserStatus = (id, estado) => {
  const user = findMockUserById(id);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  user.estado = Boolean(estado);
  user.updated_at = nowIso();
  return serializeMockUser(user);
};

export const changeMockUserPassword = (userId, currentPassword, newPassword) => {
  const user = findMockUserById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  if (user.contrasena_plain !== currentPassword) {
    throw new AppError('La contraseña actual es incorrecta', 400);
  }

  user.contrasena_plain = newPassword;
  user.updated_at = nowIso();
  return { message: 'Contraseña actualizada exitosamente' };
};

export const getMockUsersStats = () => {
  const total = mockUsers.length;
  const activos = mockUsers.filter((u) => u.estado).length;
  const inactivos = total - activos;
  const superadmin = mockUsers.filter((u) => u.rol === 'superadmin').length;
  const administrador = mockUsers.filter((u) => u.rol === 'administrador').length;
  const operario = mockUsers.filter((u) => u.rol === 'operario').length;

  return {
    total,
    activos,
    inactivos,
    por_rol: {
      superadmin,
      administrador,
      operario
    }
  };
};

export const findMockFarmById = (id) => {
  const target = String(id ?? '').trim();
  return mockFarms.find((f) => String(f._id) === target) || null;
};

export const createMockFarm = ({ nombre, ubicacion, latitud, longitud, area_m2, estado, responsable }) => {
  const timestamp = nowIso();
  const newFarm = {
    _id: new mongoose.Types.ObjectId().toString(),
    nombre: nombre.trim(),
    ubicacion: ubicacion.trim(),
    ...(latitud !== undefined ? { latitud } : {}),
    ...(longitud !== undefined ? { longitud } : {}),
    ...(responsable !== undefined ? { responsable } : {}),
    area_m2,
    estado: estado !== undefined ? Boolean(estado) : true,
    created_at: timestamp,
    updated_at: timestamp
  };

  mockFarms.unshift(newFarm);
  return serializeMockFarm(newFarm);
};

export const listMockFarms = ({ estado, q, page = 1, limit = 10 } = {}) => {
  let filtered = [...mockFarms];

  if (estado !== undefined) {
    const active = estado === 'true' || estado === true;
    filtered = filtered.filter((f) => f.estado === active);
  }

  if (q && typeof q === 'string') {
    const regex = new RegExp(q.trim(), 'i');
    filtered = filtered.filter((f) => regex.test(f.nombre) || regex.test(f.ubicacion));
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const total = filtered.length;
  const paged = filtered.slice(skip, skip + limitNum).map(serializeMockFarm);

  return {
    predios: paged,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

export const updateMockFarm = (id, data) => {
  const farm = findMockFarmById(id);
  if (!farm) {
    throw new AppError('Predio no encontrado', 404);
  }

  if (data.nombre !== undefined) farm.nombre = data.nombre.trim();
  if (data.ubicacion !== undefined) farm.ubicacion = data.ubicacion.trim();
  if (data.latitud !== undefined) farm.latitud = data.latitud;
  if (data.longitud !== undefined) farm.longitud = data.longitud;
  if (data.responsable !== undefined) farm.responsable = data.responsable;
  if (data.area_m2 !== undefined) farm.area_m2 = data.area_m2;
  if (data.estado !== undefined) farm.estado = Boolean(data.estado);
  farm.updated_at = nowIso();

  return serializeMockFarm(farm);
};

export const changeMockFarmStatus = (id, estado) => {
  const farm = findMockFarmById(id);
  if (!farm) {
    throw new AppError('Predio no encontrado', 404);
  }

  farm.estado = Boolean(estado);
  farm.updated_at = nowIso();
  return serializeMockFarm(farm);
};
