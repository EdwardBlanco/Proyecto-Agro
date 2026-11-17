import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { loginValidator } from '../validators/auth.validator.js';
import { validateFields } from '../middlewares/validateFields.js';
import { validateJwt } from '../middlewares/validateJwt.js';

const router = Router();

// Endpoints públicos de autenticación
router.post('/login', loginValidator, validateFields, login);

// Endpoints protegidos mediante token JWT
router.get('/me', validateJwt, me);

export default router;
