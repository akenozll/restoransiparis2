const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// General API rate limit
const apiLimiter = createRateLimit(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.'
);

// Login rate limit (more strict)
const loginLimiter = createRateLimit(
    parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS) || 5,
    'Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.'
);

// Security headers middleware
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdn.socket.io"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
});

// XSS protection
const xssProtection = xss();

// HTTP Parameter Pollution protection
const hppProtection = hpp();

// MongoDB injection protection
const mongoSanitization = mongoSanitize();

// Compression middleware
const compressionMiddleware = compression();

// Logging middleware
const loggingMiddleware = morgan('combined');

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Geçersiz JSON formatı' });
    }
    
    if (err.message === 'CORS policy violation') {
        return res.status(403).json({ error: 'CORS politikası ihlali' });
    }
    
    res.status(500).json({ error: 'Sunucu hatası' });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({ error: 'Sayfa bulunamadı' });
};

module.exports = {
    apiLimiter,
    loginLimiter,
    securityHeaders,
    xssProtection,
    hppProtection,
    mongoSanitization,
    compressionMiddleware,
    loggingMiddleware,
    corsOptions,
    errorHandler,
    notFoundHandler
};


