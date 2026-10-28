import { Router } from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { loginValidator } from '../validators/auth.validator.js';
import { validarCampos } from '../middlewares/validarCampos.js';
import { validarJWT } from '../middlewares/validar-jwt.js';

const router = Router();

// Endpoints públicos
router.post('/login', loginValidator, validarCampos, login);

// Endpoints protegidos
router.get('/me', validarJWT, me);

export default router;
