import { validationResult } from "express-validator";

/**
 * Middleware que revisa si las reglas previas de express-validator encontraron errores en la petición.
 * Si existen errores, responde inmediatamente con estado 400 y el detalle; de lo contrario, continúa con next().
 * @param {import('express').Request} req - Objeto de solicitud HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @param {import('express').NextFunction} next - Función para continuar al siguiente middleware
 */
export const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    const detailedMessages = errorList.map((err) => err.msg).join('. ');

    return res.status(400).json({
      status: "fail",
      mensaje: "Error de validación",
      message: detailedMessages || "Error de validación",
      errores: errorList.map((err) => ({
        campo: err.path,
        mensaje: err.msg,
      })),
      details: errorList.map((err) => `${err.path}: ${err.msg}`)
    });
  }
  next();
};

export default validateFields;
