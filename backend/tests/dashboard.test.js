import request from 'supertest';
import app from '../src/app.js';
import { Usuario } from '../src/models/Usuario.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 2 — Autorización por Rol y Dashboard Inicial (GP-01)', () => {
  let superadminToken;
  let adminToken;
  let operarioToken;
  let superadminUser;
  let adminUser;
  let operarioUser;

  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await Usuario.init();

    // 1. Crear usuario Superadmin
    superadminUser = await Usuario.create({
      nombre: 'Super Administrador',
      correo: 'superadmin@agro.com',
      contrasena_hash: 'SuperAdminSecret123!',
      rol: 'superadmin',
      estado: true
    });

    // 2. Crear usuario Administrador
    adminUser = await Usuario.create({
      nombre: 'Admin Predio',
      correo: 'admin@agro.com',
      contrasena_hash: 'AdminSecret123!',
      rol: 'administrador',
      estado: true
    });

    // 3. Crear usuario Operario
    operarioUser = await Usuario.create({
      nombre: 'Carlos Operario',
      correo: 'operario@agro.com',
      contrasena_hash: 'OperarioSecret123!',
      rol: 'operario',
      estado: true
    });

    // Obtener tokens mediante login
    const loginSuperadmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'superadmin@agro.com', contrasena: 'SuperAdminSecret123!' });
    superadminToken = loginSuperadmin.body.data.token;

    const loginAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'admin@agro.com', contrasena: 'AdminSecret123!' });
    adminToken = loginAdmin.body.data.token;

    const loginOperario = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'operario@agro.com', contrasena: 'OperarioSecret123!' });
    operarioToken = loginOperario.body.data.token;
  });

  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  describe('Control de Acceso Basado en Roles (RBAC)', () => {
    it('debe rechazar con 403 Forbidden cuando un operario intenta crear un usuario', async () => {
      const res = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({
          nombre: 'Intento Ilegal',
          correo: 'ilegal@agro.com',
          contrasena: 'Secret1234!',
          rol: 'operario'
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });

    it('debe rechazar con 403 Forbidden cuando un operario intenta listar usuarios del sistema', async () => {
      const res = await request(app)
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });

    it('debe rechazar con 403 Forbidden cuando un operario intenta cambiar el estado de otro usuario', async () => {
      const res = await request(app)
        .patch(`/api/v1/usuarios/${adminUser._id}/estado`)
        .set('Authorization', `Bearer ${operarioToken}`)
        .send({ estado: false });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });

    it('debe permitir que un administrador cree y liste usuarios exitosamente', async () => {
      // 1. Crear nuevo operario
      const createRes = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nombre: 'Nuevo Trabajador',
          correo: 'trabajador@agro.com',
          contrasena: 'Trabajador123!',
          rol: 'operario'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.status).toBe('success');
      expect(createRes.body.data.correo).toBe('trabajador@agro.com');

      // 2. Listar usuarios
      const listRes = await request(app)
        .get('/api/v1/usuarios')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.status).toBe('success');
      expect(listRes.body.data.total).toBe(4);
    });

    it('debe permitir que un superadmin gestione usuarios sin restricciones de rol', async () => {
      const createRes = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          nombre: 'Nuevo SubAdmin',
          correo: 'subadmin@agro.com',
          contrasena: 'SubAdmin123!',
          rol: 'administrador'
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.rol).toBe('administrador');
    });
  });

  describe('GET /api/v1/dashboard/resumen (Golden Path GP-01)', () => {
    it('debe rechazar con 401 si no se envía token de autenticación', async () => {
      const res = await request(app).get('/api/v1/dashboard/resumen');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message || res.body.msg).toMatch(/token/i);
    });

    it('debe rechazar con 401 si se envía un token inválido o corrupto', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/resumen')
        .set('Authorization', 'Bearer token_invalido_xyz123');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
    });

    it('debe retornar métricas globales de gestión cuando consulta un superadmin', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/resumen')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('rol', 'superadmin');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data.indicadores).toHaveProperty('usuarios');

      const { usuarios } = res.body.data.indicadores;
      expect(usuarios.total).toBe(3);
      expect(usuarios.activos).toBe(3);
      expect(usuarios.inactivos).toBe(0);
      expect(usuarios.por_rol).toEqual({
        superadmin: 1,
        administrador: 1,
        operario: 1
      });
    });

    it('debe retornar métricas globales de gestión cuando consulta un administrador', async () => {
      // Crear un usuario inactivo adicional para comprobar el contador
      await Usuario.create({
        nombre: 'Usuario Inactivo',
        correo: 'inactivo@agro.com',
        contrasena_hash: 'Inactivo123!',
        rol: 'operario',
        estado: false
      });

      const res = await request(app)
        .get('/api/v1/dashboard/resumen')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.rol).toBe('administrador');

      const { usuarios } = res.body.data.indicadores;
      expect(usuarios.total).toBe(4);
      expect(usuarios.activos).toBe(3);
      expect(usuarios.inactivos).toBe(1);
      expect(usuarios.por_rol.operario).toBe(2);
    });

    it('debe retornar métricas operativas contextuales y no exponer desglose global cuando consulta un operario', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/resumen')
        .set('Authorization', `Bearer ${operarioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.rol).toBe('operario');
      expect(res.body.data.usuario.correo).toBe('operario@agro.com');

      // Comprobar que no expone la gestión global de usuarios
      expect(res.body.data.indicadores.usuarios).toBeUndefined();

      // Comprobar estructura operativa contextual
      expect(res.body.data.indicadores).toHaveProperty('predios_asignados', 0);
      expect(res.body.data.indicadores).toHaveProperty('labores_pendientes', 0);
      expect(res.body.data.indicadores).toHaveProperty('incidencias_reportadas', 0);
    });
  });
});
