# 🔒 Güvenlik Dokümantasyonu

## Genel Bakış

Bu restoran sipariş sistemi, endüstri standardı güvenlik önlemleri ile korunmaktadır. Aşağıda uygulanan tüm güvenlik özellikleri detaylandırılmıştır.

## 🛡️ Uygulanan Güvenlik Önlemleri

### 1. **HTTPS/SSL Koruması**
- **Helmet.js** ile güvenlik başlıkları
- **Content Security Policy (CSP)** aktif
- **HSTS** (HTTP Strict Transport Security) aktif
- **X-Frame-Options** ile clickjacking koruması

### 2. **Şifre Güvenliği**
- **Bcrypt.js** ile şifre hash'leme (12 salt rounds)
- Şifreler asla düz metin olarak saklanmaz
- Güçlü şifre politikası (minimum 6 karakter)
- Brute-force saldırılarına karşı rate limiting

### 3. **Yetkilendirme ve Kimlik Doğrulama**
- **JWT (JSON Web Token)** tabanlı authentication
- **Role-Based Access Control (RBAC)**
- HttpOnly ve Secure cookie'ler
- Session yönetimi
- Token expiration (24 saat)

### 4. **Input Validation ve Sanitization**
- **express-validator** ile input doğrulama
- **XSS koruması** (xss-clean)
- **SQL/NoSQL injection koruması** (mongo-sanitize)
- **HTTP Parameter Pollution koruması** (hpp)

### 5. **Rate Limiting**
- **express-rate-limit** ile API koruması
- Login endpoint'i için özel rate limiting (5 deneme/15 dakika)
- Genel API için rate limiting (100 istek/15 dakika)

### 6. **CORS Koruması**
- Whitelist tabanlı origin kontrolü
- Credentials desteği
- Güvenli header'lar

### 7. **Güvenlik Başlıkları**
```javascript
// Helmet.js ile uygulanan başlıklar:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000; includeSubDomains
- Content-Security-Policy: [CSP directives]
```

## 🔧 Kurulum ve Yapılandırma

### 1. **Environment Değişkenleri**
```bash
# .env dosyası oluşturun
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-super-secret-session-key
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
LOGIN_RATE_LIMIT_WINDOW_MS=900000
ALLOWED_ORIGINS=https://yourdomain.com
COOKIE_SECURE=true
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=strict
```

### 2. **Güvenli Server Başlatma**
```bash
# Güvenlik paketlerini yükleyin
npm install

# Güvenlik audit'i çalıştırın
npm audit

# Güvenli server'ı başlatın
node server-secure.js
```

## 🚨 Güvenlik Kontrol Listesi

### Production Deployment Öncesi
- [ ] Environment değişkenleri güvenli şekilde ayarlandı
- [ ] HTTPS sertifikası yüklendi
- [ ] Güvenlik başlıkları test edildi
- [ ] Rate limiting aktif
- [ ] Input validation test edildi
- [ ] XSS koruması test edildi
- [ ] SQL injection koruması test edildi
- [ ] JWT token'ları güvenli
- [ ] Cookie'ler HttpOnly ve Secure
- [ ] CORS politikası doğru ayarlandı

### Düzenli Güvenlik Kontrolleri
- [ ] `npm audit` ile güvenlik açıklarını kontrol edin
- [ ] Paket güncellemelerini takip edin
- [ ] Log dosyalarını inceleyin
- [ ] Rate limiting loglarını kontrol edin
- [ ] Başarısız giriş denemelerini izleyin

## 🛠️ Güvenlik Testleri

### 1. **XSS Testi**
```javascript
// Bu input'lar engellenmelidir:
<script>alert('xss')</script>
javascript:alert('xss')
<img src=x onerror=alert('xss')>
```

### 2. **SQL Injection Testi**
```javascript
// Bu input'lar engellenmelidir:
'; DROP TABLE users; --
' OR 1=1 --
```

### 3. **Rate Limiting Testi**
```bash
# Hızlı ardışık istekler gönderin
for i in {1..10}; do curl -X POST http://localhost:3000/api/auth/login; done
```

### 4. **Authentication Testi**
```bash
# Geçersiz token ile istek gönderin
curl -H "Authorization: Bearer invalid-token" http://localhost:3000/api/orders
```

## 📊 Güvenlik İstatistikleri

### Rate Limiting
- **API Rate Limit**: 100 istek/15 dakika
- **Login Rate Limit**: 5 deneme/15 dakika
- **Block Duration**: 15 dakika

### Token Güvenliği
- **JWT Expiration**: 24 saat
- **Refresh Token**: Yok (güvenlik için)
- **Token Rotation**: Manuel

### Password Security
- **Hash Algorithm**: Bcrypt
- **Salt Rounds**: 12
- **Minimum Length**: 6 karakter
- **Complexity**: Basit (geliştirilebilir)

## 🔍 Güvenlik Logları

### Loglanan Olaylar
- Başarısız giriş denemeleri
- Rate limit ihlalleri
- 404 hataları
- 500 hataları
- Authentication hataları
- Authorization hataları

### Log Formatı
```javascript
{
  timestamp: '2024-01-01T12:00:00.000Z',
  level: 'error',
  message: 'Failed login attempt',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  username: 'testuser'
}
```

## 🚀 Production Güvenlik Önerileri

### 1. **SSL/TLS**
```bash
# Let's Encrypt ile ücretsiz SSL
sudo certbot --nginx -d yourdomain.com
```

### 2. **Reverse Proxy**
```nginx
# Nginx konfigürasyonu
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. **Firewall**
```bash
# UFW ile firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 4. **Monitoring**
```bash
# PM2 ile process monitoring
npm install -g pm2
pm2 start server-secure.js --name "restoran-sistemi"
pm2 startup
pm2 save
```

## 📞 Güvenlik İletişimi

Güvenlik açığı bulursanız:
1. **Email**: security@yourdomain.com
2. **Responsible Disclosure**: 90 gün
3. **Bug Bounty**: Yok (şimdilik)

## 📚 Ek Kaynaklar

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security](https://expressjs.com/en/advanced/best-practices-security.html)
- [JWT Security](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Son Güncelleme**: 2024-01-01
**Versiyon**: 1.0.0
**Güvenlik Seviyesi**: Yüksek


