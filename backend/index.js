import 'dotenv/config';
import app from './src/app.js';
import { conectarDB } from './src/config/db.js';
import config from './src/config/env.js';

const PORT = config.port || process.env.PORT || 3000;

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});

export default app;
