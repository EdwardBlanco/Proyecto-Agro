/**
 * Pruebas de integración del módulo de autenticación (GP-01).
 * Cubre el inicio de sesión con generación de JWT, validación de credenciales,
 * rechazo de usuarios inactivos y consulta del perfil autenticado (/auth/me).
 */
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 1 — Módulo de Autenticación (GP-01)', () => {
  // Conectar a la base de datos aislada de pruebas antes de ejecutar la suite
  beforeAll(async () => {
    await connectTestDb();
  });

  // Limpiar colecciones e inicializar índices únicos antes de cada caso
  beforeEach(async () => {
    await clearTestDb();
    await User.init();
  });

  // Limpiar datos residuales y cerrar la conexión al finalizar la suite
  afterAll(async () => {
    await clearTestDb();
    await disconnectTestDb();
  });

  const testUser = {
    nombre: 'Carlos Agrónomo',
    correo: 'carlos@agro.com',
    contrasena_hash: 'Password123!',
    rol: 'administrador',
    estado: true
  };

  // Escenarios de inicio de sesión y validaciones de entrada
  describe('POST /api/v1/auth/login', () => {
    it('debe iniciar sesión con credenciales válidas y retornar JWT sin exponer contrasena_hash', async () => {
      // Creamos el usuario en la BD de pruebas
      await User.create(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'carlos@agro.com',
          contrasena: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data).toHaveProperty('usuario');
      expect(res.body.data.usuario.correo).toBe('carlos@agro.com');
      expect(res.body.data.usuario.nombre).toBe('Carlos Agrónomo');
      expect(res.body.data.usuario.rol).toBe('administrador');

      // Verificación estricta de seguridad: nunca exponer contrasena_hash ni la clave en texto plano
      expect(res.body.data.usuario.contrasena_hash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Password123!');
    });

    it('debe responder 401 ante una contraseña incorrecta', async () => {
      await User.create(testUser);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'carlos@agro.com',
          contrasena: 'ContrasenaIncorrecta'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Credenciales inválidas/i);
    });

    it('debe responder 401 si el correo no existe en el sistema', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'noexiste@agro.com',
          contrasena: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/Credenciales inválidas/i);
    });

    it('debe responder 401 si el usuario está inactivo (estado: false)', async () => {
      await User.create({
        ...testUser,
        correo: 'inactivo@agro.com',
        estado: false
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: 'inactivo@agro.com',
          contrasena: 'Password123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/inactivo/i);
    });

    it('debe responder 400 cuando faltan datos obligatorios o el formato es incorrecto', async () => {
      // Caso sin correo electrónico
      const noEmailRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ contrasena: 'Password123!' });

      expect(noEmailRes.status).toBe(400);
      expect(noEmailRes.body.status).toBe('fail');

      // Caso con correo de formato inválido
      const invalidEmailRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ correo: 'correo-no-valido', contrasena: 'Password123!' });

      expect(invalidEmailRes.status).toBe(400);
      expect(invalidEmailRes.body.message || invalidEmailRes.body.mensaje).toMatch(/formato.*correo|correo.*válido/i);
    });
  });

  // Escenarios de consulta del perfil autenticado mediante Authorization Bearer o x-token
  describe('GET /api/v1/auth/me', () => {
    it('debe devolver el perfil del usuario autenticado si se provee Bearer Token válido', async () => {
      await User.create(testUser);

      // Iniciar sesión para obtener token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: testUser.correo,
          contrasena: 'Password123!'
        });

      const token = loginRes.body.data.token;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.status).toBe('success');
      expect(meRes.body.data.correo).toBe(testUser.correo);
      expect(meRes.body.data.nombre).toBe(testUser.nombre);
      expect(meRes.body.data.contrasena_hash).toBeUndefined();
    });

    it('debe devolver el perfil si se provee el token mediante la cabecera x-token', async () => {
      await User.create(testUser);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          correo: testUser.correo,
          contrasena: 'Password123!'
        });

      const token = loginRes.body.data.token;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('x-token', token);

      expect(meRes.status).toBe(200);
      expect(meRes.body.status).toBe('success');
      expect(meRes.body.data.correo).toBe(testUser.correo);
    });

    it('debe responder 401 si no se envía la cabecera Authorization ni x-token', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message || res.body.msg).toMatch(/No.*token/i);
    });

    it('debe responder 401 si el token es falso o está corrupto', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer token_invalido_xyz123');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message || res.body.msg).toMatch(/Token.*no válido/i);
    });
  });
});
