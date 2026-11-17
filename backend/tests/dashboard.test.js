/**
 * Pruebas de integración para el control de acceso basado en roles (RBAC)
 * y el módulo de resumen del dashboard (/api/v1/dashboard/resumen).
 * Verifica permisos diferenciados para superadmin, administrador y operario.
 */
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 2 — Autorización por Rol y Dashboard Inicial (GP-01)', () => {
  let superadminToken;
  let adminToken;
  let operatorToken;
  let superadminUser;
  let adminUser;
  let operatorUser;

  // Conectar a la base de datos de pruebas al iniciar la suite
  beforeAll(async () => {
    await connectTestDb();
  });

  // Poblar usuarios base con los tres roles del sistema y autenticarlos antes de cada prueba
  beforeEach(async () => {
    await clearTestDb();
    await User.init();

    // 1. Crear usuario Superadmin
    superadminUser = await User.create({
      nombre: 'Super Administrador',
      correo: 'superadmin@agro.com',
      contrasena_hash: 'SuperAdminSecret123!',
      rol: 'superadmin',
      estado: true
    });

    // 2. Crear usuario Administrador
    adminUser = await User.create({
      nombre: 'Admin Predio',
      correo: 'admin@agro.com',
      contrasena_hash: 'AdminSecret123!',
      rol: 'administrador',
      estado: true
    });

    // 3. Crear usuario Operario
    operatorUser = await User.create({
      nombre: 'Carlos Operario',
      correo: 'operario@agro.com',
      contrasena_hash: 'OperarioSecret123!',
      rol: 'operario',
      estado: true
    });

    // Obtener tokens mediante login para cada rol
    const superadminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'superadmin@agro.com', contrasena: 'SuperAdminSecret123!' });
    superadminToken = superadminLoginRes.body.data.token;

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'admin@agro.com', contrasena: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.data.token;

    const operatorLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: 'operario@agro.com', contrasena: 'OperarioSecret123!' });
    operatorToken = operatorLoginRes.body.data.token;
  });

  // Limpiar y cerrar conexión tras completar todas las pruebas
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  // Validación de permisos RBAC sobre los endpoints administrativos de usuarios
  describe('Control de Acceso Basado en Roles (RBAC)', () => {
    it('debe rechazar con 403 Forbidden cuando un operario intenta crear un usuario', async () => {
      const res = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${operatorToken}`)
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
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/permisos suficientes/i);
    });

    it('debe rechazar con 403 Forbidden cuando un operario intenta cambiar el estado de otro usuario', async () => {
      const res = await request(app)
        .patch(`/api/v1/usuarios/${adminUser._id}/estado`)
        .set('Authorization', `Bearer ${operatorToken}`)
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

      // 2. Listar usuarios para confirmar inclusión
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

  // Validación de indicadores del dashboard adaptados según el rol del usuario autenticado
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

      const { usuarios: usersMetrics } = res.body.data.indicadores;
      expect(usersMetrics.total).toBe(3);
      expect(usersMetrics.activos).toBe(3);
      expect(usersMetrics.inactivos).toBe(0);
      expect(usersMetrics.por_rol).toEqual({
        superadmin: 1,
        administrador: 1,
        operario: 1
      });
    });

    it('debe retornar métricas globales de gestión cuando consulta un administrador', async () => {
      // Crear un usuario inactivo adicional para comprobar el contador
      await User.create({
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

      const { usuarios: usersMetrics } = res.body.data.indicadores;
      expect(usersMetrics.total).toBe(4);
      expect(usersMetrics.activos).toBe(3);
      expect(usersMetrics.inactivos).toBe(1);
      expect(usersMetrics.por_rol.operario).toBe(2);
    });

    it('debe retornar métricas operativas contextuales y no exponer desglose global cuando consulta un operario', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/resumen')
        .set('Authorization', `Bearer ${operatorToken}`);

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
