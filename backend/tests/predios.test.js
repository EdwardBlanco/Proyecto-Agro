import request from 'supertest';
import app from '../src/app.js';
import { Usuario } from '../src/models/Usuario.model.js';
import { Predio } from '../src/models/Predio.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 3 — Módulo de Predios (GP-02)', () => {
  let adminToken;
  let operarioToken;
  let adminUser;
  let operarioUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await Usuario.init();
    await Predio.init();

    // Crear usuario admin para pruebas de mutación
    adminUser = await Usuario.create({
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
    operarioUser = await Usuario.create({
      nombre: 'Operario Campo',
      correo: 'operario.campo@agro.com',
      contrasena_hash: 'OperarioPass123!',
      rol: 'operario',
      estado: true
    });

    const operarioLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'operario.campo@agro.com',
        contrasena: 'OperarioPass123!'
      });
    operarioToken = operarioLoginRes.body.data.token;
  });

  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  describe('POST /api/v1/predios (Golden Path GP-02)', () => {
    const predioValido = {
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
        .send(predioValido);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.nombre).toBe('Hacienda La Primavera');
      expect(res.body.data.ubicacion).toBe(predioValido.ubicacion);
      expect(res.body.data.latitud).toBe(4.3468);
      expect(res.body.data.longitud).toBe(-74.3644);
      expect(res.body.data.area_m2).toBe(45000);
      expect(res.body.data.estado).toBe(true);
      expect(res.body.data).toHaveProperty('created_at');
    });

    it('debe rechazar con 400 si la latitud está fuera del rango [-90, 90]', async () => {
      const resFueraInferior = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...predioValido, latitud: -91 });

      expect(resFueraInferior.status).toBe(400);
      expect(resFueraInferior.body.message || resFueraInferior.body.mensaje).toMatch(/latitud/i);

      const resFueraSuperior = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...predioValido, latitud: 90.001 });

      expect(resFueraSuperior.status).toBe(400);
      expect(resFueraSuperior.body.message || resFueraSuperior.body.mensaje).toMatch(/latitud/i);
    });

    it('debe rechazar con 400 si la longitud está fuera del rango [-180, 180]', async () => {
      const resFueraInferior = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...predioValido, longitud: -180.5 });

      expect(resFueraInferior.status).toBe(400);
      expect(resFueraInferior.body.message || resFueraInferior.body.mensaje).toMatch(/longitud/i);

      const resFueraSuperior = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...predioValido, longitud: 181 });

      expect(resFueraSuperior.status).toBe(400);
      expect(resFueraSuperior.body.message || resFueraSuperior.body.mensaje).toMatch(/longitud/i);
    });

    it('debe rechazar con 400 si el área en m2 es negativa', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...predioValido, area_m2: -10 });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje).toMatch(/área/i);
    });

    it('debe rechazar con 400 cuando faltan campos obligatorios o exceden longitud máxima', async () => {
      // Faltan nombre y ubicacion
      const resIncompleto = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ latitud: 4.5, longitud: -74.1, area_m2: 1000 });

      expect(resIncompleto.status).toBe(400);

      // Nombre excede 120 caracteres
      const resNombreLargo = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...predioValido,
          nombre: 'A'.repeat(121)
        });

      expect(resNombreLargo.status).toBe(400);
      expect(resNombreLargo.body.message || resNombreLargo.body.mensaje || JSON.stringify(resNombreLargo.body.errores)).toMatch(/120/);
    });

    it('debe rechazar con 401 si no se envía token de autorización', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .send(predioValido);

      expect(res.status).toBe(401);
    });

    it('debe rechazar con 403 si un operario intenta crear un predio', async () => {
      const res = await request(app)
        .post('/api/v1/predios')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send(predioValido);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });
  });

  describe('GET /api/v1/predios (Listado paginado y filtros)', () => {
    beforeEach(async () => {
      await Predio.create([
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
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.predios.length).toBeGreaterThanOrEqual(1);
    });

    it('debe filtrar predios por estado activo o inactivo', async () => {
      const resActivos = await request(app)
        .get('/api/v1/predios?estado=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resActivos.status).toBe(200);
      expect(resActivos.body.data.predios.every(p => p.estado === true)).toBe(true);
      expect(resActivos.body.data.total).toBe(2);

      const resInactivos = await request(app)
        .get('/api/v1/predios?estado=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resInactivos.status).toBe(200);
      expect(resInactivos.body.data.predios.every(p => p.estado === false)).toBe(true);
      expect(resInactivos.body.data.total).toBe(1);
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

  describe('GET /api/v1/predios/:id (Consulta individual)', () => {
    let predioCreado;

    beforeEach(async () => {
      predioCreado = await Predio.create({
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
        .get(`/api/v1/predios/${predioCreado._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data._id).toBe(predioCreado._id.toString());
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

  describe('PATCH /api/v1/predios/:id (Actualización de predio)', () => {
    let predioParaActualizar;

    beforeEach(async () => {
      predioParaActualizar = await Predio.create({
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
        .patch(`/api/v1/predios/${predioParaActualizar._id}`)
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
        .patch(`/api/v1/predios/${predioParaActualizar._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          latitud: 95
        });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje).toMatch(/latitud/i);
    });

    it('debe rechazar con 403 si un operario intenta actualizar el predio', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${predioParaActualizar._id}`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({
          nombre: 'Cambio No Autorizado'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/predios/:id/estado (Desactivación lógica de predio)', () => {
    let predioActivo;

    beforeEach(async () => {
      predioActivo = await Predio.create({
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
        .patch(`/api/v1/predios/${predioActivo._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: false });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.estado).toBe(false);

      // Verificar en base de datos
      const predioEnDb = await Predio.findById(predioActivo._id);
      expect(predioEnDb.estado).toBe(false);
    });

    it('debe reactivar lógicamente un predio desactivado (estado: true)', async () => {
      await Predio.findByIdAndUpdate(predioActivo._id, { estado: false });

      const res = await request(app)
        .patch(`/api/v1/predios/${predioActivo._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: true });

      expect(res.status).toBe(200);
      expect(res.body.data.estado).toBe(true);
    });

    it('debe rechazar con 400 si el campo estado no es booleano', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${predioActivo._id}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'inactivo' });

      expect(res.status).toBe(400);
      expect(res.body.message || res.body.mensaje || JSON.stringify(res.body.errores)).toMatch(/booleano/i);
    });

    it('debe rechazar con 403 si un operario intenta cambiar el estado', async () => {
      const res = await request(app)
        .patch(`/api/v1/predios/${predioActivo._id}/estado`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ estado: false });

      expect(res.status).toBe(403);
    });
  });
});
