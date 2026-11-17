import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.model.js';
import Farm from '../models/Farm.model.js';
import { connectDB, disconnectDB } from './db.js';

/**
 * Cuentas de usuario demostrativas para inicializar la base de datos.
 */
export const DEMO_USERS = [
  {
    nombre: 'Laura Mendoza',
    correo: 'admin@agrogestion.demo',
    contrasena_hash: 'Agro2026!',
    rol: 'administrador',
    estado: true
  },
  {
    nombre: 'Carlos Ríos',
    correo: 'superadmin@agrogestion.demo',
    contrasena_hash: 'Agro2026!',
    rol: 'superadmin',
    estado: true
  },
  {
    nombre: 'María Torres',
    correo: 'maria@agrogestion.demo',
    contrasena_hash: 'Agro2026!',
    rol: 'operario',
    estado: true
  },
  {
    nombre: 'José Pérez',
    correo: 'operario@agrogestion.demo',
    contrasena_hash: 'Agro2026!',
    rol: 'operario',
    estado: true
  }
];

/**
 * Predios agrícolas demostrativos para inicializar la base de datos.
 */
export const DEMO_FARMS = [
  {
    nombre: 'El Robledal',
    ubicacion: 'Rionegro, Antioquia',
    latitud: 6.1552,
    longitud: -75.3737,
    area_m2: 240000,
    estado: true
  },
  {
    nombre: 'La Esperanza',
    ubicacion: 'La Ceja, Antioquia',
    latitud: 6.0319,
    longitud: -75.4316,
    area_m2: 180000,
    estado: true
  }
];

/**
 * Inserta de forma idempotente las cuentas demostrativas iniciales en la colección usuarios.
 * @returns {Promise<{ created: number, skipped: number, total: number }>} Resumen de inserción
 */
export const seedDemoUsers = async () => {
  let created = 0;
  let skipped = 0;

  for (const demoUser of DEMO_USERS) {
    const existing = await User.findOne({ correo: demoUser.correo.toLowerCase() });
    if (existing) {
      skipped += 1;
      continue;
    }

    await User.create({
      nombre: demoUser.nombre,
      correo: demoUser.correo.toLowerCase(),
      contrasena_hash: demoUser.contrasena_hash,
      rol: demoUser.rol,
      estado: demoUser.estado
    });
    created += 1;
  }

  return {
    created,
    skipped,
    total: DEMO_USERS.length
  };
};

/**
 * Inserta de forma idempotente los predios demostrativos iniciales en la colección predios.
 * @returns {Promise<{ created: number, skipped: number, total: number }>} Resumen de inserción
 */
export const seedDemoFarms = async () => {
  let created = 0;
  let skipped = 0;

  for (const demoFarm of DEMO_FARMS) {
    const existing = await Farm.findOne({ nombre: demoFarm.nombre });
    if (existing) {
      skipped += 1;
      continue;
    }

    await Farm.create({
      nombre: demoFarm.nombre,
      ubicacion: demoFarm.ubicacion,
      latitud: demoFarm.latitud,
      longitud: demoFarm.longitud,
      area_m2: demoFarm.area_m2,
      estado: demoFarm.estado
    });
    created += 1;
  }

  return {
    created,
    skipped,
    total: DEMO_FARMS.length
  };
};

// Permite ejecutar el script de seed directamente desde CLI sin afectar las importaciones en tests o app
const __filename = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  connectDB()
    .then(async () => {
      const usersResult = await seedDemoUsers();
      console.log(
        `[Seed] Usuarios demo procesados: ${usersResult.created} creados, ${usersResult.skipped} existentes.`
      );
      const farmsResult = await seedDemoFarms();
      console.log(
        `[Seed] Predios demo procesados: ${farmsResult.created} creados, ${farmsResult.skipped} existentes.`
      );
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[Seed] Error ejecutando seed de datos demo:', error.message);
      await disconnectDB();
      process.exit(1);
    });
}

export default seedDemoUsers;
