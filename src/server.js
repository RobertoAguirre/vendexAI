const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const connectMemoryDB = require('./config/database-memory');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const chatRoutes = require('./routes/chat');
const followUpRoutes = require('./routes/followUp');
const analyticsRoutes = require('./routes/analytics');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');

// Import services
const SocketService = require('./services/SocketService');
const FollowUpService = require('./services/FollowUpService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/followup', followUpRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/products', productRoutes);

// Error handling
app.use(errorHandler);

// Initialize services
const socketService = new SocketService(io);
const followUpService = new FollowUpService();

async function startServer() {
  try {
    // Connect to databases
    try {
      await connectDB();
    } catch (error) {
      logger.warn('MongoDB no disponible, usando base de datos en memoria para demo');
      await connectMemoryDB();
    }
    
    // Initialize follow-up service
    await followUpService.initialize();
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
      logger.info(`🌍 Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server };