// Main server file - Entry point for the CineSense backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./config/database');
const logger = require('./utils/logger');
const sanitizeInput = require('./middleware/inputSanitizer');
const { generalLimiter } = require('./middleware/rateLimiter');
const { validateRequiredEnv } = require('./utils/validateEnv');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Validate environment variables before starting server (skip in test mode)
if (process.env.NODE_ENV !== 'test' && !validateRequiredEnv()) {
  logger.error('Server startup aborted due to missing required environment variables');
  process.exit(1);
}

const app = express();

// Security middleware - Helmet.js sets various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting - Apply to all routes
app.use('/api', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization - Protect against XSS
app.use(sanitizeInput);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Swagger/OpenAPI Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Serve Swagger UI (only in development or if ENABLE_SWAGGER is true)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CineSense API Documentation',
  }));
  
  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/movies', require('./routes/movieRoutes'));
app.use('/api/recommendations', require('./routes/recommendationRoutes'));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: CineSense API is running
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CineSense API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error using Winston logger
  logger.logError(err, req);
  
  // Don't expose error details in production
  const errorMessage = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong. Please try again later.' 
    : err.message || 'Something went wrong!';
  
  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Export app for testing
module.exports = app;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
    });
    
    // Test database connection
    db.getConnection((err, connection) => {
      if (err) {
        logger.error('Database connection error', { error: err.message });
      } else {
        logger.info('Database connected successfully');
        connection.release();
      }
    });
  });
}

