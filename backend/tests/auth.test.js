import request from 'supertest';
import app from '../src/app.js';
import { Usuario } from '../src/models/Usuario.model.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../src/shared/testUtils/testDb.js';

describe('Fase 1 — Módulo de Autenticación (GP-01)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await Usuario.init();
  });

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

  describe('POST /api/v1/auth/login', () => {
    it('debe iniciar sesión con credenciales válidas y retornar JWT sin exponer contrasena_hash', async () => {
      // Creamos el usuario en la BD de pruebas
      await Usuario.create(testUser);

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

      // Verificación estricta de seguridad: nunca exponer contrasena_hash
      expect(res.body.data.usuario.contrasena_hash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Password123!');
    });

    it('debe responder 401 ante una contraseña incorrecta', async () => {
      await Usuario.create(testUser);

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
      await Usuario.create({
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
      const resSinCorreo = await request(app)
        .post('/api/v1/auth/login')
        .send({ contrasena: 'Password123!' });

      expect(resSinCorreo.status).toBe(400);
      expect(resSinCorreo.body.status).toBe('fail');

      const resEmailInvalido = await request(app)
        .post('/api/v1/auth/login')
        .send({ correo: 'correo-no-valido', contrasena: 'Password123!' });

      expect(resEmailInvalido.status).toBe(400);
      expect(resEmailInvalido.body.message || resEmailInvalido.body.mensaje).toMatch(/formato.*correo|correo.*válido/i);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('debe devolver el perfil del usuario autenticado si se provee Bearer Token válido', async () => {
      await Usuario.create(testUser);

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
      await Usuario.create(testUser);

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
