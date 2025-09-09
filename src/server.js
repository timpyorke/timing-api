const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swagger = require('./config/swagger');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Mount LINE webhook BEFORE body parsers to preserve raw body for signature verification
app.use('/api/line', require('./routes/line'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Locale middleware
app.use(require('./middleware/locale'));

// Serve static files
app.use(express.static('public'));

// Swagger documentation
app.use('/api-docs', swagger.serve, swagger.setup);

// Routes
app.use('/api', require('./routes/customer'));
app.use('/api/admin', require('./routes/admin'));
// LINE webhook mounted above body parsers

// Ensure DB schema pieces exist (e.g., line_tokens)
require('./models/init')().catch(err => {
  console.error('Database initialization error:', err?.message || err);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-07-29T15:22:48.417Z
 */
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
