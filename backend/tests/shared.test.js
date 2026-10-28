import { jest } from '@jest/globals';
import AppError from '../src/shared/errors/AppError.js';
import errorHandler from '../src/middlewares/errorHandler.js';
import { sendSuccess, sendCreated, sendError } from '../src/shared/http/response.js';
import authorizeRole from '../src/middlewares/authorizeRole.js';

describe('Shared Utilities and Errors', () => {
  describe('AppError', () => {
    it('debe instanciar correctamente con statusCode 400 y status "fail"', () => {
      const error = new AppError('Error de cliente', 400, { field: 'email' });
      expect(error.message).toBe('Error de cliente');
      expect(error.statusCode).toBe(400);
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('debe instanciar con statusCode 500 y status "error" por defecto', () => {
      const error = new AppError('Error interno');
      expect(error.message).toBe('Error interno');
      expect(error.statusCode).toBe(500);
      expect(error.status).toBe('error');
      expect(error.details).toBeNull();
    });
  });

  describe('HTTP Response Utilities', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    it('sendSuccess debe responder con status 200 y estructura esperada', () => {
      sendSuccess(mockRes, { item: 1 }, 'Operación exitosa');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Operación exitosa',
        data: { item: 1 }
      });
    });

    it('sendCreated debe responder con status 201', () => {
      sendCreated(mockRes, { id: '123' }, 'Creado con éxito');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Creado con éxito',
        data: { id: '123' }
      });
    });

    it('sendError debe responder con statusCode y status correspondiente', () => {
      sendError(mockRes, 'No autorizado', 401, { reason: 'Token expirado' });
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        statusCode: 401,
        message: 'No autorizado',
        details: { reason: 'Token expirado' }
      });
    });
  });

  describe('errorHandler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      mockNext = jest.fn();
    });

    it('debe procesar CastError de Mongoose convirtiéndolo en 400', () => {
      const castError = { name: 'CastError', path: '_id' };
      errorHandler(castError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          statusCode: 400,
          message: expect.stringContaining('_id')
        })
      );
    });

    it('debe procesar Duplicate Key error 11000 convirtiéndolo en 409', () => {
      const dupError = { code: 11000, keyValue: { correo: 'test@agro.com' } };
      errorHandler(dupError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          statusCode: 409,
          message: expect.stringContaining('correo')
        })
      );
    });

    it('debe procesar ValidationError de Mongoose convirtiéndolo en 400', () => {
      const valError = {
        name: 'ValidationError',
        errors: {
          nombre: { message: 'El nombre es obligatorio' }
        }
      };
      errorHandler(valError, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'fail',
          statusCode: 400,
          message: expect.stringContaining('El nombre es obligatorio')
        })
      );
    });
  });

  describe('authorizeRole Middleware', () => {
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockRes = {};
      mockNext = jest.fn();
    });

    it('debe llamar a next() si el rol del usuario está dentro de los roles permitidos', () => {
      const middleware = authorizeRole('superadmin', 'administrador');
      const mockReq = { user: { rol: 'administrador' } };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe funcionar correctamente cuando se pasan roles en forma de arreglo', () => {
      const middleware = authorizeRole(['operario', 'administrador']);
      const mockReq = { user: { rol: 'operario' } };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe rechazar con 403 AppError si el rol del usuario no tiene permisos', () => {
      const middleware = authorizeRole('superadmin', 'administrador');
      const mockReq = { user: { rol: 'operario' } };

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed).toBeInstanceOf(AppError);
      expect(errorPassed.statusCode).toBe(403);
      expect(errorPassed.message).toMatch(/permisos suficientes/i);
    });

    it('debe rechazar con 401 si no hay usuario o rol en req.user', () => {
      const middleware = authorizeRole('superadmin');
      const mockReq = {};

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed).toBeInstanceOf(AppError);
      expect(errorPassed.statusCode).toBe(401);
    });
  });
});
