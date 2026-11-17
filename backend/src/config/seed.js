import path from 'path';
import { fileURLToPath } from 'url';
import Usuario from '../models/Usuario.model.js';
import Predio from '../models/Predio.model.js';
import { conectarDB, disconnectDB } from './db.js';

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

export const DEMO_PREDIOS = [
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
 */
export const seedDemoUsers = async () => {
  let created = 0;
  let skipped = 0;

  for (const demoUser of DEMO_USERS) {
    const existing = await Usuario.findOne({ correo: demoUser.correo.toLowerCase() });
    if (existing) {
      skipped += 1;
      continue;
    }

    await Usuario.create({
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
 */
export const seedDemoPredios = async () => {
  let created = 0;
  let skipped = 0;

  for (const demoPredio of DEMO_PREDIOS) {
    const existing = await Predio.findOne({ nombre: demoPredio.nombre });
    if (existing) {
      skipped += 1;
      continue;
    }

    await Predio.create({
      nombre: demoPredio.nombre,
      ubicacion: demoPredio.ubicacion,
      latitud: demoPredio.latitud,
      longitud: demoPredio.longitud,
      area_m2: demoPredio.area_m2,
      estado: demoPredio.estado
    });
    created += 1;
  }

  return {
    created,
    skipped,
    total: DEMO_PREDIOS.length
  };
};

const __filename = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  conectarDB()
    .then(async () => {
      const usersResult = await seedDemoUsers();
      console.log(
        `[Seed] Usuarios demo procesados: ${usersResult.created} creados, ${usersResult.skipped} existentes.`
      );
      const prediosResult = await seedDemoPredios();
      console.log(
        `[Seed] Predios demo procesados: ${prediosResult.created} creados, ${prediosResult.skipped} existentes.`
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
