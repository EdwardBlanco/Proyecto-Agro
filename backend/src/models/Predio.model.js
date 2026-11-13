import mongoose from 'mongoose';

const predioSchema = new mongoose.Schema(
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
      required: [true, 'La latitud es obligatoria'],
      min: [-90, 'La latitud no puede ser menor a -90'],
      max: [90, 'La latitud no puede ser mayor a 90']
    },
    longitud: {
      type: Number,
      required: [true, 'La longitud es obligatoria'],
      min: [-180, 'La longitud no puede ser menor a -180'],
      max: [180, 'La longitud no puede ser mayor a 180']
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

predioSchema.index({ nombre: 1 });
predioSchema.index({ estado: 1 });

predioSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

predioSchema.set('toObject', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Predio = mongoose.models.Predio || mongoose.model('Predio', predioSchema);

export default Predio;
