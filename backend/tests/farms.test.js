/**
 * Pruebas de integración del módulo de predios agrícolas (/api/v1/predios).
 * Cubre creación, validaciones geográficas y de área, listado paginado con filtros,
 * consulta individual, actualización parcial y desactivación/reactivación lógica.
 */
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { Farm } from '../src/models/Farm.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 3 — Módulo de Predios (GP-02)', () => {
  let adminToken;
  let operatorToken;
  let adminUser;
  let operatorUser;

  // Conectar a la base de datos de pruebas al iniciar la suite
  beforeAll(async () => {
    await connectTestDb();
  });

  // Limpiar BD, inicializar índices y crear usuarios administrador y operario antes de cada prueba
  beforeEach(async () => {
    await clearTestDb();
    await User.init();
    await Farm.init();

    // Crear usuario admin para pruebas de mutación
    adminUser = await User.create({
      nombre: 'Admin Predios',
      correo: 'admin.predios@agro.com',
      contrasena_hash: 'AdminSecret123!',
      rol: 'administrador',
      estado: true
    });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'admin.predios@agro.com',
        contrasena: 'AdminSecret123!'
      });
    adminToken = adminLoginRes.body.data.token;

    // Crear usuario operario para pruebas de control de acceso RBAC
    operatorUser = await User.create({
      nombre: 'Operario Campo',
      correo: 'operario.campo@agro.com',
      contrasena_hash: 'OperarioPass123!',
      rol: 'operario',
      estado: true
    });

    const operatorLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'operario.campo@agro.com',
        contrasena: 'OperarioPass123!'
      });
    operatorToken = operatorLoginRes.body.data.token;
  });

  // Limpiar colección de pruebas y cerrar conexión al terminar la suite
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  // Escenarios de creación de predios y validación de coordenadas geográficas y área
  describe('POST /api/v1/predios (Golden Path GP-02)', () => {
    const validFarm = {
      nombre: 'Hacienda La Primavera',
      ubicacion: 'Fusagasugá, Cundinamarca, Vereda El Espinal',
      latitud: 4.3468,
      longitud: -74.3644,
      area_m2: 45000,
      estado: true
    };

    it('debe crear un predio exitosamente con coordenadas y área válidas (201)', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validFarm);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.nombre).toBe('Hacienda La Primavera');
      expect(res.body.data.ubicacion).toBe(validFarm.ubicacion);
      expect(res.body.data.latitud).toBe(4.3468);
      expect(res.body.data.longitud).toBe(-74.3644);
      expect(res.body.data.area_m2).toBe(45000);
      expect(res.body.data.estado).toBe(true);
      expect(res.body.data).toHaveProperty('created_at');
    });

    it('debe conservar el responsable sin inventar coordenadas cuando no fueron registradas', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validFarm,
          latitud: undefined,
          longitud: undefined,
          responsable: 'user-responsable'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.responsable).toBe('user-responsable');
      expect(res.body.data.latitud).toBeUndefined();
      expect(res.body.data.longitud).toBeUndefined();
      const savedFarm = await Farm.findById(res.body.data._id);
      expect(savedFarm.responsable).toBe('user-responsable');
      expect(savedFarm.latitud).toBeUndefined();
      expect(savedFarm.longitud).toBeUndefined();
    });

    it('debe rechazar con 400 si la latitud está fuera del rango [-90, 90]', async () => {
      const belowRangeRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validFarm, latitud: -91 });

      expect(belowRangeRes.status).toBe(400);
      expect(belowRangeRes.body.message || belowRangeRes.body.mensaje).toMatch(/latitud/i);

      const aboveRangeRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validFarm, latitud: 90.001 });

      expect(aboveRangeRes.status).toBe(400);
      expect(aboveRangeRes.body.message || aboveRangeRes.body.mensaje).toMatch(/latitud/i);
    });

    it('debe rechazar con 400 si la longitud está fuera del rango [-180, 180]', async () => {
      const belowRangeRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validFarm, longitud: -180.5 });

      expect(belowRangeRes.status).toBe(400);
      expect(belowRangeRes.body.message || belowRangeRes.body.mensaje).toMatch(/longitud/i);

      const aboveRangeRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validFarm, longitud: 181 });

      expect(aboveRangeRes.status).toBe(400);
      expect(aboveRangeRes.body.message || aboveRangeRes.body.mensaje).toMatch(/longitud/i);
    });

    it('debe rechazar con 400 si el área en m2 es negativa', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validFarm, area_m2: -10 });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje).toMatch(/área/i);
    });

    it('debe rechazar con 400 cuando faltan campos obligatorios o exceden longitud máxima', async () => {
      // Faltan nombre y ubicacion
      const incompleteRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 4.5, longitud: -74.1, area_m2: 1000 });

      expect(incompleteRes.status).toBe(400);

      // Nombre excede 120 caracteres
      const longNameRes = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validFarm,
          nombre: 'A'.repeat(121)
        });

      expect(longNameRes.status).toBe(400);
      expect(longNameRes.body.message || longNameRes.body.mensaje || JSON.stringify(longNameRes.body.errores)).toMatch(/120/);
    });

    it('debe rechazar con 401 si no se envía token de autorización', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .send(validFarm);

      expect(res.status).toBe(401);
    });

    it('debe rechazar con 403 si un operario intenta crear un predio', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validFarm);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });
  });

  // Escenarios de listado paginado, filtro por estado y búsqueda por texto
  describe('GET /api/v1/predios (Listado paginado y filtros)', () => {
    beforeEach(async () => {
      await Farm.create([
        {
          nombre: 'Finca El Paraíso',
          ubicacion: 'Cota, Cundinamarca',
          latitud: 4.8112,
          longitud: -74.1012,
          area_m2: 25000,
          estado: true
        },
        {
          nombre: 'Finca Santa Inés',
          ubicacion: 'Facatativá, Cundinamarca',
          latitud: 4.8136,
          longitud: -74.3541,
          area_m2: 80000,
          estado: true
        },
        {
          nombre: 'Predio Inactivo Los Sauces',
          ubicacion: 'Madrid, Cundinamarca',
          latitud: 4.7325,
          longitud: -74.2642,
          area_m2: 15000,
          estado: false
        }
      ]);
    });

    it('debe listar los predios paginados correctamente', async () => {
      const res = await request(app)
        .get('/api/v1/predios?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.predios).toHaveLength(2);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.totalPages).toBe(2);
    });

    it('debe permitir a un operario consultar el listado de predios', async () => {
      const res = await request(app)
        .get('/api/v1/predios')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.predios.length).toBeGreaterThanOrEqual(1);
    });

    it('debe filtrar predios por estado activo o inactivo', async () => {
      const activeRes = await request(app)
        .get('/api/v1/predios?estado=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(activeRes.status).toBe(200);
      expect(activeRes.body.data.predios.every((farm) => farm.estado === true)).toBe(true);
      expect(activeRes.body.data.total).toBe(2);

      const inactiveRes = await request(app)
        .get('/api/v1/predios?estado=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(inactiveRes.status).toBe(200);
      expect(inactiveRes.body.data.predios.every((farm) => farm.estado === false)).toBe(true);
      expect(inactiveRes.body.data.total).toBe(1);
    });

    it('debe buscar predios por término de búsqueda q en nombre o ubicación', async () => {
      const res = await request(app)
        .get('/api/v1/predios?q=Paraíso')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.predios).toHaveLength(1);
      expect(res.body.data.predios[0].nombre).toBe('Finca El Paraíso');
    });
  });

  // Escenarios de consulta individual por identificador
  describe('GET /api/v1/predios/:id (Consulta individual)', () => {
    let createdFarm;

    beforeEach(async () => {
      createdFarm = await Farm.create({
        nombre: 'Granja San José',
        ubicacion: 'Subachoque, Cundinamarca',
        latitud: 4.9312,
        longitud: -74.1724,
        area_m2: 32000,
        estado: true
      });
    });

    it('debe obtener un predio existente por su ID', async () => {
      const res = await request(app)
        .get(`/api/v1/predios/${createdFarm._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data._id).toBe(createdFarm._id.toString());
      expect(res.body.data.nombre).toBe('Granja San José');
    });

    it('debe responder 404 para un ID válido pero inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/predios/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message || res.body.mensaje).toMatch(/no encontrado/i);
    });

    it('debe responder 400 para un ID con formato inválido', async () => {
      const res = await request(app)
        .get('/api/v1/predios/id-invalido-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // Escenarios de actualización parcial de atributos del predio
  describe('PATCH /api/v1/predios/:id (Actualización de predio)', () => {
    let farmToUpdate;

    beforeEach(async () => {
      farmToUpdate = await Farm.create({
        nombre: 'Finca La Esperanza',
        ubicacion: 'Tenjo, Cundinamarca',
        latitud: 4.8721,
        longitud: -74.1456,
        area_m2: 50000,
        estado: true
      });
    });

    it('debe actualizar campos específicos de un predio exitosamente', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${farmToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Hacienda La Esperanza Renovada',
          area_m2: 65000,
          latitud: 4.875
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.nombre).toBe('Hacienda La Esperanza Renovada');
      expect(res.body.data.area_m2).toBe(65000);
      expect(res.body.data.latitud).toBe(4.875);
      expect(res.body.data.ubicacion).toBe('Tenjo, Cundinamarca');
    });

    it('debe rechazar con 400 si se envía un valor de coordenadas o área inválido', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${farmToUpdate._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitud: 95
        });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje).toMatch(/latitud/i);
    });

    it('debe rechazar con 403 si un operario intenta actualizar el predio', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${farmToUpdate._id}`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          nombre: 'Cambio No Autorizado'
        });

      expect(res.status).toBe(403);
    });
  });

  // Escenarios de cambio de estado lógico (desactivación y reactivación)
  describe('PATCH /api/v1/predios/:id/estado (Desactivación lógica de predio)', () => {
    let activeFarm;

    beforeEach(async () => {
      activeFarm = await Farm.create({
        nombre: 'Finca Vista Hermosa',
        ubicacion: 'Tabio, Cundinamarca',
        latitud: 4.9123,
        longitud: -74.0987,
        area_m2: 30000,
        estado: true
      });
    });

    it('debe desactivar lógicamente un predio (estado: false)', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${activeFarm._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: false });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.estado).toBe(false);

      // Verificar persistencia en base de datos
      const farmInDb = await Farm.findById(activeFarm._id);
      expect(farmInDb.estado).toBe(false);
    });

    it('debe reactivar lógicamente un predio desactivado (estado: true)', async () => {
      await Farm.findByIdAndUpdate(activeFarm._id, { estado: false });

      const res = await request(app)
        .patch(`/api/v1/predios/${activeFarm._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: true });

      expect(res.status).toBe(200);
      expect(res.body.data.estado).toBe(true);
    });

    it('debe rechazar con 400 si el campo estado no es booleano', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${activeFarm._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'inactivo' });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje || JSON.stringify(res.body.errores)).toMatch(/booleano/i);
    });

    it('debe rechazar con 403 si un operario intenta cambiar el estado', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${activeFarm._id}/estado`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ estado: false });

      expect(res.status).toBe(403);
    });
  });
});
