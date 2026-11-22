import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Supabase Project defaults for project yutnoyupoxlmxrcoqfui
  const SUPABASE_PROJECT_ID = 'yutnoyupoxlmxrcoqfui';
  const SUPABASE_DEFAULT_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

  // Safe config endpoint for client initialization
  app.get('/api/config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    res.json({
      supabaseUrl,
      supabaseAnonKey,
      projectId: SUPABASE_PROJECT_ID,
      isConfigured: Boolean(supabaseAnonKey),
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      projectId: SUPABASE_PROJECT_ID,
    });
  });

  // Mount Vite development middlewares or serve static build
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Teacher Attendance Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
