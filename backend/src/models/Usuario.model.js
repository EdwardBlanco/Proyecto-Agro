import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ROLES_PERMITIDOS = ['superadmin', 'administrador', 'operario'];

const usuarioSchema = new mongoose.Schema(
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
        values: ROLES_PERMITIDOS,
        message: 'Rol inválido: {VALUE}. Permitidos: ' + ROLES_PERMITIDOS.join(', ')
      },
      default: 'operario'
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

// Middleware pre-save para hashear la contraseña si ha sido modificada
usuarioSchema.pre('save', async function (next) {
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

// Método de instancia para verificar contraseña
usuarioSchema.methods.compararContrasena = async function (contrasenaCandidata) {
  if (!this.contrasena_hash) {
    return false;
  }
  return bcrypt.compare(contrasenaCandidata, this.contrasena_hash);
};

// Transformación a JSON para nunca exponer contrasena_hash ni __v
usuarioSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.contrasena_hash;
    delete ret.__v;
    return ret;
  }
});

usuarioSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.contrasena_hash;
    delete ret.__v;
    return ret;
  }
});

export const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);

export default Usuario;
