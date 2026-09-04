import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors'; // 1. Se agrega la importación de CORS
import { apiRouter } from './server/routes/api.router.ts';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();

  // 2. Configuración de CORS para permitir conexiones desde Vercel y local
  app.use(cors({
    origin: [
      'https://crm-dexter-nu.vercel.app', // Tu frontend desplegado en Vercel
      'http://localhost:5173',            // Frontend en desarrollo local
      'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // Middleware for JSON parsing and urlencoded
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CRM DEXTER API Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API router
  app.use('/api', apiRouter);

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 CRM DEXTER Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 API Endpoints ready at /api/*`);
    console.log(`🗄️ Storage directories active in ./storage/`);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start CRM DEXTER server:', err);
  process.exit(1);
});