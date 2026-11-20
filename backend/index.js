import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import config from './src/config/env.js';
import { seedDemoUsers } from './src/config/seed.js';

const PORT = config.port || process.env.PORT || 3000;

// En entorno local conecta a MongoDB, inicializa usuarios demo fuera de test y levanta el servidor HTTP.
// En Vercel Serverless, la conexión y seed inicial se gestionan por petición en src/app.js.
if (!process.env.VERCEL) {
  connectDB().then(async () => {
    if (config.nodeEnv !== 'test') {
      try {
        await seedDemoUsers();
      } catch (error) {
        console.error('Error al inicializar usuarios demo:', error.message);
      }
    }

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  });
}

export default app;
