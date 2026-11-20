import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Roles permitidos para los usuarios del sistema.
 * Se conservan en español porque forman parte del contrato de datos en MongoDB y la API.
 */
export const ALLOWED_ROLES = ['superadmin', 'administrador', 'operario'];

/**
 * Esquema Mongoose para la colección 'usuarios'.
 * Mantiene los nombres de campos del esquema y mensajes de validación en español.
 */
const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    correo: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [150, 'El correo electrónico no puede exceder 150 caracteres'],
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un correo electrónico válido']
    },
    contrasena_hash: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false
    },
    rol: {
      type: String,
      required: [true, 'El rol es obligatorio'],
      enum: {
        values: ALLOWED_ROLES,
        message: 'Rol inválido: {VALUE}. Permitidos: ' + ALLOWED_ROLES.join(', ')
      },
      default: 'operario'
    },
    predios_asignados: {
      type: [{ type: String, trim: true }],
      default: []
    },
    estado: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'usuarios'
  }
);

/**
 * Hook pre-save para encriptar la contraseña con bcrypt únicamente cuando ha sido modificada.
 * Evita re-hashear contraseñas que ya vienen cifradas con prefijo $2a$ o $2b$.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('contrasena_hash')) {
    return next();
  }

  // Si ya es un hash de bcrypt, no volver a hashear
  if (this.contrasena_hash.startsWith('$2a$') || this.contrasena_hash.startsWith('$2b$')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasena_hash = await bcrypt.hash(this.contrasena_hash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Método de instancia para comparar una contraseña en texto plano contra el hash almacenado.
 * @param {string} candidatePassword - Contraseña en texto plano a verificar
 * @returns {Promise<boolean>} true si coincide con el hash almacenado; false en caso contrario
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.contrasena_hash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.contrasena_hash);
};

// Transformación a JSON para nunca exponer contrasena_hash ni __v en las respuestas
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.contrasena_hash;
    delete ret.__v;
    return ret;
  }
});

// Transformación a objeto plano para nunca exponer contrasena_hash ni __v
userSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.contrasena_hash;
    delete ret.__v;
    return ret;
  }
});

/**
 * Modelo Mongoose de Usuario vinculado a la colección 'usuarios'.
 */
export const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
