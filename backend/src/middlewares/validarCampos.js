import { validationResult } from "express-validator";

/**
 * Revisa si las reglas del validator (que corrieron antes en la cadena) encontraron errores.
 * Si hay errores, corta la petición aquí con 400. Si no hay errores, deja pasar con next().
 */
export const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    const errorList = errores.array();
    const mensajesDetallados = errorList.map((err) => err.msg).join('. ');

    return res.status(400).json({
      status: "fail",
      mensaje: "Error de validación",
      message: mensajesDetallados || "Error de validación",
      errores: errorList.map((err) => ({
        campo: err.path,
        mensaje: err.msg,
      })),
      details: errorList.map((err) => `${err.path}: ${err.msg}`)
    });
  }
  next();
};

export default validarCampos;
