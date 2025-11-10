import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = (await import('./backend/config/database.js')).default;
const app = express();

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS Configuration for frontend dev server
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body Parsing Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes with Error Handling
const setupRoute = async (routePath, routeFile) => {
  try {
    const routeModule = await import(routeFile);
    app.use(routePath, routeModule.default || routeModule);
    console.log(`✅ Route loaded: ${routePath}`);
  } catch (error) {
    console.error(`❌ Failed to load route ${routePath}:`, error.message);
    
    // Provide a basic route for problematic endpoints
    app.use(routePath, (req, res) => {
      res.status(200).json({
        success: true,
        message: `${routePath} endpoint is temporarily unavailable`,
        data: []
      });
    });
  }
};

// Load API Routes
await setupRoute('/api/auth', './backend/routes/authRoutes.js');
await setupRoute('/api/patients', './backend/routes/patientRoutes.js');
await setupRoute('/api/departments', './backend/routes/departmentRoutes.js');
await setupRoute('/api/doctors', './backend/routes/doctorRoutes.js');

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Jijue Hospital API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// 404 Handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global Error Handling Middleware
app.use((error, req, res, next) => {
  console.error('Unhandled Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend API server running on port ${PORT}`);
  console.log(`📊 Backend API: http://localhost:${PORT}/api`);
  console.log('❤️  Health check at http://localhost:' + PORT + '/api/health');
  console.log('✅ Backend server ready!');
  console.log('🌐 Frontend should run separately on: http://localhost:3000 or http://localhost:5173');
});

export default app;