/**
 * Pruebas de integración del módulo de usuarios (/api/v1/usuarios).
 * Cubre creación, validación de duplicados, listado con filtros, consulta por ID,
 * actualización de datos, cambio de estado lógico y cambio de contraseña propia.
 */
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 1 — Módulo de Usuarios (GP-01)', () => {
  let authToken;
  let adminUser;

  // Conectar a la base de datos de pruebas al iniciar la suite
  beforeAll(async () => {
    await connectTestDb();
  });

  // Limpiar BD, crear usuario superadmin base y obtener su token antes de cada prueba
  beforeEach(async () => {
    await clearTestDb();
    await User.init();

    // Crear usuario admin base y obtener token para rutas protegidas
    adminUser = await User.create({
      nombre: 'Administrador Principal',
      correo: 'admin@agro.com',
      contrasena_hash: 'AdminSecret123!',
      rol: 'superadmin',
      estado: true
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        correo: 'admin@agro.com',
        contrasena: 'AdminSecret123!'
      });

    authToken = loginRes.body.data.token;
  });

  // Limpiar colecciones y cerrar la conexión al finalizar
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  // Escenarios de creación de usuarios, unicidad de correo y validaciones de entrada
  describe('POST /api/v1/usuarios', () => {
    it('debe crear un usuario exitosamente y retornar 201 sin exponer contrasena_hash', async () => {
      const newUser = {
        nombre: 'Pedro Operario',
        correo: 'pedro@agro.com',
        contrasena: 'OperarioPass123!',
        rol: 'operario'
      };

      const res = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.correo).toBe('pedro@agro.com');
      expect(res.body.data.nombre).toBe('Pedro Operario');
      expect(res.body.data.rol).toBe('operario');
      expect(res.body.data.estado).toBe(true);
      expect(res.body.data.contrasena_hash).toBeUndefined();
    });

    it('debe rechazar con 409 Conflict si el correo ya está registrado', async () => {
      await User.create({
        nombre: 'Usuario Duplicado',
        correo: 'duplicado@agro.com',
        contrasena_hash: 'Pass123456!',
        rol: 'operario'
      });

      const res = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Otro Usuario',
          correo: 'duplicado@agro.com',
          contrasena: 'Pass123456!',
          rol: 'operario'
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/registrado|duplicado/i);
    });

    it('debe rechazar con 400 si los datos de entrada son inválidos', async () => {
      // Falta el campo obligatorio nombre
      const missingNameRes = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          correo: 'invalido@agro.com',
          contrasena: 'Pass123456!'
        });

      expect(missingNameRes.status).toBe(400);

      // Contraseña demasiado corta
      const shortPasswordRes = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Test Corto',
          correo: 'corto@agro.com',
          contrasena: '123'
        });

      expect(shortPasswordRes.status).toBe(400);

      // Rol fuera del catálogo permitido
      const invalidRoleRes = await request(app)
        .post('/api/v1/usuarios')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Test Rol',
          correo: 'rolinvalido@agro.com',
          contrasena: 'Pass123456!',
          rol: 'rol_fantasma'
        });

      expect(invalidRoleRes.status).toBe(400);
    });

    it('debe rechazar con 401 si no se envía token de autenticación', async () => {
      const res = await request(app)
        .post('/api/v1/usuarios')
        .send({
          nombre: 'Sin Auth',
          correo: 'sinauth@agro.com',
          contrasena: 'Pass123456!'
        });

      expect(res.status).toBe(401);
    });
  });

  // Escenarios de listado paginado y filtrado por rol
  describe('GET /api/v1/usuarios', () => {
    it('debe listar los usuarios con paginación y permitir filtros por rol y estado', async () => {
      await User.create([
        { nombre: 'Op 1', correo: 'op1@agro.com', contrasena_hash: 'Pass123456!', rol: 'operario', estado: true },
        { nombre: 'Op 2', correo: 'op2@agro.com', contrasena_hash: 'Pass123456!', rol: 'operario', estado: false },
        { nombre: 'Admin 2', correo: 'admin2@agro.com', contrasena_hash: 'Pass123456!', rol: 'administrador', estado: true }
      ]);

      const res = await request(app)
        .get('/api/v1/usuarios?rol=operario')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('usuarios');
      expect(Array.isArray(res.body.data.usuarios)).toBe(true);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.usuarios.every((user) => user.rol === 'operario')).toBe(true);
    });
  });

  // Escenarios de consulta individual por ID
  describe('GET /api/v1/usuarios/:id', () => {
    it('debe retornar un usuario existente por su ID', async () => {
      const user = await User.create({
        nombre: 'Consulta Test',
        correo: 'consulta@agro.com',
        contrasena_hash: 'Pass123456!',
        rol: 'operario'
      });

      const res = await request(app)
        .get(`/api/v1/usuarios/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id.toString()).toBe(user._id.toString());
      expect(res.body.data.correo).toBe('consulta@agro.com');
    });

    it('debe responder 404 para un ID inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/v1/usuarios/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('fail');
    });
  });

  // Escenarios de actualización de datos y conflicto de correo duplicado
  describe('PATCH /api/v1/usuarios/:id', () => {
    it('debe actualizar los datos permitidos del usuario', async () => {
      const user = await User.create({
        nombre: 'Nombre Anterior',
        correo: 'anterior@agro.com',
        contrasena_hash: 'Pass123456!',
        rol: 'operario'
      });

      const res = await request(app)
        .patch(`/api/v1/usuarios/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nombre: 'Nombre Modificado',
          rol: 'administrador'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.nombre).toBe('Nombre Modificado');
      expect(res.body.data.rol).toBe('administrador');
    });

    it('debe rechazar con 409 si se intenta cambiar el correo a uno que ya pertenece a otro usuario', async () => {
      await User.create({
        nombre: 'Usuario Existente',
        correo: 'existente@agro.com',
        contrasena_hash: 'Pass123456!',
        rol: 'operario'
      });

      const user = await User.create({
        nombre: 'Usuario A Modificar',
        correo: 'modificar@agro.com',
        contrasena_hash: 'Pass123456!',
        rol: 'operario'
      });

      const res = await request(app)
        .patch(`/api/v1/usuarios/${user._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ correo: 'existente@agro.com' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/en uso/i);
    });
  });

  // Escenarios de activación y desactivación lógica de usuarios
  describe('PATCH /api/v1/usuarios/:id/estado', () => {
    it('debe desactivar y activar lógicamente un usuario', async () => {
      const user = await User.create({
        nombre: 'Usuario Estado',
        correo: 'estado@agro.com',
        contrasena_hash: 'Pass123456!',
        estado: true
      });

      // Desactivar usuario
      const deactivateRes = await request(app)
        .patch(`/api/v1/usuarios/${user._id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: false });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data.estado).toBe(false);

      // Reactivar usuario
      const reactivateRes = await request(app)
        .patch(`/api/v1/usuarios/${user._id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: true });

      expect(reactivateRes.status).toBe(200);
      expect(reactivateRes.body.data.estado).toBe(true);
    });

    it('debe rechazar con 400 si el campo estado no es un booleano', async () => {
      const user = await User.create({
        nombre: 'Usuario Estado Invalido',
        correo: 'invalido_estado@agro.com',
        contrasena_hash: 'Pass123456!'
      });

      const res = await request(app)
        .patch(`/api/v1/usuarios/${user._id}/estado`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ estado: 'no-booleano' });

      expect(res.status).toBe(400);
    });
  });

  // Escenarios de cambio de contraseña del usuario autenticado
  describe('PATCH /api/v1/usuarios/me/contrasena', () => {
    it('debe permitir cambiar la contraseña si la actual es correcta y permitir login con la nueva', async () => {
      const res = await request(app)
        .patch('/api/v1/usuarios/me/contrasena')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contrasena_actual: 'AdminSecret123!',
          contrasena_nueva: 'NuevaClaveSuperSegura2026!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      // Intentar login con la clave anterior (debe fallar 401)
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'admin@agro.com',
          contrasena: 'AdminSecret123!'
        });

      expect(oldLoginRes.status).toBe(401);

      // Intentar login con la nueva contraseña (debe ser exitoso 200)
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'admin@agro.com',
          contrasena: 'NuevaClaveSuperSegura2026!'
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data).toHaveProperty('token');
    });

    it('debe rechazar con 400 si la contraseña actual no coincide', async () => {
      const res = await request(app)
        .patch('/api/v1/usuarios/me/contrasena')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contrasena_actual: 'ContrasenaIncorrecta!',
          contrasena_nueva: 'NuevaClaveSuperSegura2026!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/incorrecta/i);
    });

    it('debe rechazar con 400 si la nueva contraseña es idéntica a la actual', async () => {
      const res = await request(app)
        .patch('/api/v1/usuarios/me/contrasena')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contrasena_actual: 'AdminSecret123!',
          contrasena_nueva: 'AdminSecret123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/distinta/i);
    });
  });
});
