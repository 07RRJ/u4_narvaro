// src/index.js
import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import requestRoutes from './routes/request.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(join(__dirname, 'public')));

const PORT = Number(process.env.PORT || 3000);

app.use('/', requestRoutes);

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});

// node --env-file=.env src/index.js