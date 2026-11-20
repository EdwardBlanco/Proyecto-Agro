import mongoose from 'mongoose';

/**
 * Esquema Mongoose para la colección 'predios'.
 * Define los datos geográficos, extensión y estado operativo de cada predio agrícola.
 */
const farmSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [120, 'El nombre no puede exceder 120 caracteres']
    },
    ubicacion: {
      type: String,
      required: [true, 'La ubicación es obligatoria'],
      trim: true,
      maxlength: [200, 'La ubicación no puede exceder 200 caracteres']
    },
    latitud: {
      type: Number,
      min: [-90, 'La latitud no puede ser menor a -90'],
      max: [90, 'La latitud no puede ser mayor a 90']
    },
    longitud: {
      type: Number,
      min: [-180, 'La longitud no puede ser menor a -180'],
      max: [180, 'La longitud no puede ser mayor a 180']
    },
    responsable: {
      type: String,
      trim: true,
      maxlength: [100, 'El responsable no puede exceder 100 caracteres']
    },
    area_m2: {
      type: Number,
      required: [true, 'El área en m2 es obligatoria'],
      min: [0, 'El área en m2 no puede ser menor a 0']
    },
    estado: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'predios'
  }
);

// Índices para optimizar búsquedas por nombre y filtrado por estado activo/inactivo
farmSchema.index({ nombre: 1 });
farmSchema.index({ estado: 1 });

// Transformaciones de serialización para omitir el campo interno de versión __v
farmSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

farmSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

/**
 * Modelo Mongoose de Predio vinculado a la colección 'predios'.
 */
export const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema);

export default Farm;
