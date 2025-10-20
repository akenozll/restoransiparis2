const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT token oluşturma
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { 
            expiresIn: '24h',
            issuer: 'restoran-sistemi',
            audience: 'restoran-users'
        }
    );
};

// JWT token doğrulama
const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token bulunamadı' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Geçersiz token' });
    }
};

// Role-based access control
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Yetkilendirme gerekli' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }
        
        next();
    };
};

// Admin yetkisi kontrolü
const requireAdmin = requireRole(['admin']);

// Kullanıcı yetkisi kontrolü
const requireUser = requireRole(['user', 'admin']);

// Şifre hash'leme
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
};

// Şifre doğrulama
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Input sanitization
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .trim()
        .replace(/[<>]/g, '') // XSS koruması
        .replace(/javascript:/gi, '') // JavaScript injection koruması
        .replace(/on\w+=/gi, ''); // Event handler koruması
};

// User input validation
const validateUserInput = (input) => {
    const errors = [];
    
    if (!input.username || input.username.length < 3) {
        errors.push('Kullanıcı adı en az 3 karakter olmalıdır');
    }
    
    if (!input.password || input.password.length < 6) {
        errors.push('Şifre en az 6 karakter olmalıdır');
    }
    
    if (input.username && !/^[a-zA-Z0-9_]+$/.test(input.username)) {
        errors.push('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
    }
    
    return errors;
};

// Session kontrolü
const checkSession = (req, res, next) => {
    if (req.session && req.session.user) {
        req.user = req.session.user;
        next();
    } else {
        res.status(401).json({ error: 'Oturum bulunamadı' });
    }
};

module.exports = {
    generateToken,
    verifyToken,
    requireRole,
    requireAdmin,
    requireUser,
    hashPassword,
    verifyPassword,
    sanitizeInput,
    validateUserInput,
    checkSession
};


