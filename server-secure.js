require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

// Security middleware imports
const {
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
} = require('./middleware/security');

// Auth middleware imports
const {
    generateToken,
    verifyToken,
    requireAdmin,
    requireUser,
    hashPassword,
    verifyPassword,
    sanitizeInput,
    validateUserInput
} = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Security middleware setup
app.use(securityHeaders);
app.use(xssProtection);
app.use(hppProtection);
app.use(mongoSanitization);
app.use(compressionMiddleware);
app.use(loggingMiddleware);

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Cookie and session middleware
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: process.env.COOKIE_HTTPONLY === 'true',
        sameSite: process.env.COOKIE_SAMESITE || 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// CORS setup
app.use(cors(corsOptions));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// In-memory data storage (in production, use database)
let users = [
    {
        id: 1,
        username: 'isletme123',
        email: 'isletme@restoran.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', // isletme1235
        role: 'user'
    },
    {
        id: 2,
        username: 'admin123',
        email: 'admin@restoran.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', // admin1235
        role: 'admin'
    }
];

let menu = {
    yemekler: [
        { id: 1, name: 'Kebap', price: 45.00, category: 'Ana Yemek' },
        { id: 2, name: 'Pide', price: 25.00, category: 'Ana Yemek' },
        { id: 3, name: 'Çorba', price: 15.00, category: 'Çorba' },
        { id: 4, name: 'Salata', price: 20.00, category: 'Salata' }
    ],
    icecekler: [
        { id: 5, name: 'Su', price: 5.00, category: 'İçecek' },
        { id: 6, name: 'Kola', price: 8.00, category: 'İçecek' },
        { id: 7, name: 'Çay', price: 3.00, category: 'İçecek' },
        { id: 8, name: 'Kahve', price: 10.00, category: 'İçecek' }
    ]
};

let masalar = [
    { id: 1, name: 'Masa 1', status: 'dolu' },
    { id: 2, name: 'Masa 2', status: 'bos' },
    { id: 3, name: 'Masa 3', status: 'bos' },
    { id: 4, name: 'Masa 4', status: 'bos' },
    { id: 5, name: 'Masa 5', status: 'dolu' },
    { id: 6, name: 'Masa 6', status: 'bos' }
];

let orders = [];

// Initialize hashed passwords
const initializePasswords = async () => {
    const isletmePassword = await hashPassword('isletme1235');
    const adminPassword = await hashPassword('admin1235');
    
    users[0].password = isletmePassword;
    users[1].password = adminPassword;
};

// Initialize passwords on startup
initializePasswords();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/garson', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'garson.html'));
});

app.get('/mutfak', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mutfak.html'));
});

app.get('/kasa', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'kasa.html'));
});

// API Routes
app.get('/api/menu', (req, res) => {
    res.json(menu);
});

app.get('/api/masalar', (req, res) => {
    res.json(masalar);
});

app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// Secure authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Input validation
        const validationErrors = validateUserInput({ username, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({ error: validationErrors[0] });
        }
        
        // Sanitize inputs
        const sanitizedUsername = sanitizeInput(username);
        const sanitizedPassword = sanitizeInput(password);
        
        // Find user
        const user = users.find(u => u.username === sanitizedUsername);
        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }
        
        // Verify password
        const isValidPassword = await verifyPassword(sanitizedPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure cookie
        res.cookie('token', token, {
            httpOnly: process.env.COOKIE_HTTPONLY === 'true',
            secure: process.env.COOKIE_SECURE === 'true',
            sameSite: process.env.COOKIE_SAMESITE || 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        
        res.json({
            success: true,
            message: 'Giriş başarılı!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Sunucu hatası oluştu' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    req.session.destroy();
    res.json({ success: true, message: 'Çıkış başarılı' });
});

// Protected routes
app.post('/api/orders', verifyToken, requireUser, (req, res) => {
    try {
        const { masaId, items, aciklama } = req.body;
        
        // Input validation
        if (!masaId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Geçersiz sipariş verisi' });
        }
        
        // Sanitize description
        const sanitizedAciklama = sanitizeInput(aciklama || '');
        
        const order = {
            id: Date.now(),
            masaId,
            items,
            aciklama: sanitizedAciklama,
            status: 'mutfakta',
            timestamp: new Date(),
            userId: req.user.id,
            userName: req.user.username
        };
        
        orders.push(order);
        
        // Update table status
        const masa = masalar.find(m => m.id === masaId);
        if (masa) {
            masa.status = 'dolu';
        }
        
        // Emit to all clients
        io.emit('newOrder', order);
        io.emit('masaUpdate', masalar);
        
        res.json(order);
        
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Sipariş oluşturulurken hata oluştu' });
    }
});

app.put('/api/orders/:id/status', verifyToken, requireUser, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Input validation
        const validStatuses = ['mutfakta', 'hazirlaniyor', 'hazir', 'servise-cikti'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Geçersiz durum' });
        }
        
        const order = orders.find(o => o.id === parseInt(id));
        if (!order) {
            return res.status(404).json({ error: 'Sipariş bulunamadı' });
        }
        
        order.status = status;
        
        // Emit to all clients
        io.emit('orderStatusUpdate', { orderId: id, status });
        
        res.json(order);
        
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Durum güncellenirken hata oluştu' });
    }
});

// Admin-only routes
app.get('/api/admin/stats', verifyToken, requireAdmin, (req, res) => {
    try {
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'mutfakta').length,
            completedOrders: orders.filter(o => o.status === 'hazir').length,
            totalRevenue: orders.reduce((sum, order) => {
                const orderTotal = order.items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
                return sum + orderTotal;
            }, 0)
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'İstatistikler alınırken hata oluştu' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send initial data
    socket.emit('menuData', menu);
    socket.emit('masaData', masalar);
    socket.emit('orderData', orders);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Güvenli Restoran Sistemi ${PORT} portunda çalışıyor`);
    console.log(`🔒 Güvenlik özellikleri aktif`);
    console.log(`📊 Rate limiting aktif`);
    console.log(`🛡️ Helmet güvenlik başlıkları aktif`);
    console.log(`🔐 JWT authentication aktif`);
    console.log(`🚫 XSS koruması aktif`);
    console.log(`🚫 SQL injection koruması aktif`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});


