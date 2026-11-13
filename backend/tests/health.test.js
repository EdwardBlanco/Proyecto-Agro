import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/app.js';
import { db } from '../src/config/db.js';

describe('Fase 0 — Base Técnica y Health Check', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/health', () => {
    it('debe responder 200 con el estado del servidor, uptime y db', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body).toHaveProperty('db');
      expect(['connected', 'disconnected', 'connecting', 'disconnecting']).toContain(response.body.db);
    });

    it('debe reflejar el estado "connected" cuando el servicio reporta base de datos activa', async () => {
      jest.spyOn(db, 'getDatabaseStatus').mockReturnValue('connected');

      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.db).toBe('connected');
    });

    it('debe reflejar el estado "disconnected" cuando el servicio reporta base de datos desconectada', async () => {
      jest.spyOn(db, 'getDatabaseStatus').mockReturnValue('disconnected');

      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.db).toBe('disconnected');
    });
  });

  describe('Manejo de rutas no encontradas (404)', () => {
    it('debe responder 404 con formato JSON estandarizado para GET inexistente', async () => {
      const response = await request(app).get('/api/v1/ruta-inexistente');

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'fail',
          statusCode: 404,
          message: expect.stringContaining('/api/v1/ruta-inexistente')
        })
      );
    });

    it('debe responder 404 con formato JSON estandarizado para POST inexistente', async () => {
      const response = await request(app).post('/api/v1/recurso-inexistente').send({ dummy: true });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'fail',
          statusCode: 404,
          message: expect.stringContaining('/api/v1/recurso-inexistente')
        })
      );
    });
  });
});
