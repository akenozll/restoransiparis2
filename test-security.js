#!/usr/bin/env node

/**
 * Güvenlik Test Script'i
 * Bu script, restoran sipariş sisteminin güvenlik özelliklerini test eder
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Test konfigürasyonu
const config = {
    baseUrl: process.env.TEST_URL || 'http://localhost:3000',
    timeout: 5000,
    verbose: process.argv.includes('--verbose')
};

// Test sonuçları
const results = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

// Utility fonksiyonları
const log = (message, type = 'info') => {
    const colors = {
        info: '\x1b[36m',    // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m',   // Red
        warning: '\x1b[33m', // Yellow
        reset: '\x1b[0m'     // Reset
    };
    
    if (config.verbose || type === 'error' || type === 'success') {
        console.log(`${colors[type]}${message}${colors.reset}`);
    }
};

const makeRequest = (options, data = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(options.path, config.baseUrl);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: config.timeout
        };

        const client = url.protocol === 'https:' ? https : http;
        const req = client.request(requestOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Request timeout')));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
};

const runTest = async (name, testFunction) => {
    results.total++;
    log(`\n🧪 Test: ${name}`, 'info');
    
    try {
        await testFunction();
        results.passed++;
        log(`✅ ${name} - BAŞARILI`, 'success');
        results.details.push({ name, status: 'PASSED' });
    } catch (error) {
        results.failed++;
        log(`❌ ${name} - BAŞARISIZ: ${error.message}`, 'error');
        results.details.push({ name, status: 'FAILED', error: error.message });
    }
};

// Güvenlik testleri
const securityTests = {
    // 1. Rate Limiting Testi
    async testRateLimiting() {
        log('Rate limiting testi başlatılıyor...', 'info');
        
        // Hızlı ardışık istekler gönder
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(makeRequest({
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { username: 'test', password: 'test' }));
        }
        
        const responses = await Promise.all(promises);
        const rateLimited = responses.some(res => res.status === 429);
        
        if (!rateLimited) {
            throw new Error('Rate limiting aktif değil');
        }
    },

    // 2. XSS Koruması Testi
    async testXSSProtection() {
        log('XSS koruması testi başlatılıyor...', 'info');
        
        const xssPayloads = [
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '<img src=x onerror=alert("xss")>',
            '"><script>alert("xss")</script>'
        ];
        
        for (const payload of xssPayloads) {
            const response = await makeRequest({
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { username: payload, password: payload });
            
            // XSS payload'ı response'da olmamalı
            if (JSON.stringify(response.body).includes(payload)) {
                throw new Error(`XSS payload tespit edildi: ${payload}`);
            }
        }
    },

    // 3. SQL Injection Koruması Testi
    async testSQLInjectionProtection() {
        log('SQL injection koruması testi başlatılıyor...', 'info');
        
        const sqlPayloads = [
            "'; DROP TABLE users; --",
            "' OR 1=1 --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "1' OR '1'='1"
        ];
        
        for (const payload of sqlPayloads) {
            const response = await makeRequest({
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { username: payload, password: payload });
            
            // SQL injection başarılı olmamalı
            if (response.status === 200 && response.body.success) {
                throw new Error(`SQL injection başarılı: ${payload}`);
            }
        }
    },

    // 4. Güvenlik Başlıkları Testi
    async testSecurityHeaders() {
        log('Güvenlik başlıkları testi başlatılıyor...', 'info');
        
        const response = await makeRequest({ path: '/' });
        const headers = response.headers;
        
        const requiredHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
            'strict-transport-security'
        ];
        
        for (const header of requiredHeaders) {
            if (!headers[header]) {
                throw new Error(`Güvenlik başlığı eksik: ${header}`);
            }
        }
        
        // CSP header kontrolü
        if (!headers['content-security-policy']) {
            throw new Error('Content Security Policy başlığı eksik');
        }
    },

    // 5. Authentication Testi
    async testAuthentication() {
        log('Authentication testi başlatılıyor...', 'info');
        
        // Geçersiz token ile korumalı endpoint'e erişim
        const response = await makeRequest({
            path: '/api/orders',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-token'
            }
        }, { masaId: 1, items: [] });
        
        if (response.status !== 401) {
            throw new Error('Geçersiz token ile erişim engellenmedi');
        }
    },

    // 6. CORS Testi
    async testCORS() {
        log('CORS testi başlatılıyor...', 'info');
        
        const response = await makeRequest({
            path: '/api/menu',
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        
        // CORS header'ları kontrol et
        if (response.headers['access-control-allow-origin'] === '*') {
            throw new Error('CORS politikası çok gevşek');
        }
    },

    // 7. Input Validation Testi
    async testInputValidation() {
        log('Input validation testi başlatılıyor...', 'info');
        
        const invalidInputs = [
            { username: '', password: 'test123' },
            { username: 'ab', password: 'test123' }, // 3 karakterden az
            { username: 'test', password: '123' },   // 6 karakterden az
            { username: 'test<script>', password: 'test123' }
        ];
        
        for (const input of invalidInputs) {
            const response = await makeRequest({
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, input);
            
            // Input validation hataları 400 status döndürmeli
            if (response.status !== 400) {
                throw new Error(`Input validation başarısız: ${JSON.stringify(input)}`);
            }
        }
    },

    // 8. Session Security Testi
    async testSessionSecurity() {
        log('Session security testi başlatılıyor...', 'info');
        
        const response = await makeRequest({
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'isletme123', password: 'isletme1235' });
        
        const cookies = response.headers['set-cookie'];
        if (!cookies) {
            throw new Error('Cookie ayarlanmadı');
        }
        
        // HttpOnly flag kontrolü
        const hasHttpOnly = cookies.some(cookie => cookie.includes('HttpOnly'));
        if (!hasHttpOnly) {
            throw new Error('HttpOnly flag eksik');
        }
        
        // Secure flag kontrolü (HTTPS'te)
        if (config.baseUrl.startsWith('https')) {
            const hasSecure = cookies.some(cookie => cookie.includes('Secure'));
            if (!hasSecure) {
                throw new Error('Secure flag eksik (HTTPS)');
            }
        }
    }
};

// Ana test fonksiyonu
const runAllTests = async () => {
    log('🔒 Güvenlik Testleri Başlatılıyor...', 'info');
    log(`📍 Test URL: ${config.baseUrl}`, 'info');
    log(`⏱️ Timeout: ${config.timeout}ms`, 'info');
    
    const startTime = Date.now();
    
    // Tüm testleri çalıştır
    for (const [testName, testFunction] of Object.entries(securityTests)) {
        await runTest(testName, testFunction);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Sonuçları göster
    log('\n📊 Test Sonuçları:', 'info');
    log(`✅ Başarılı: ${results.passed}`, 'success');
    log(`❌ Başarısız: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
    log(`📈 Toplam: ${results.total}`, 'info');
    log(`⏱️ Süre: ${duration}ms`, 'info');
    
    // Başarı oranı
    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    log(`🎯 Başarı Oranı: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');
    
    // Detaylı sonuçlar
    if (config.verbose) {
        log('\n📋 Detaylı Sonuçlar:', 'info');
        results.details.forEach(detail => {
            const status = detail.status === 'PASSED' ? '✅' : '❌';
            log(`${status} ${detail.name}: ${detail.status}`, detail.status === 'PASSED' ? 'success' : 'error');
            if (detail.error) {
                log(`   Hata: ${detail.error}`, 'error');
            }
        });
    }
    
    // Exit code
    process.exit(results.failed > 0 ? 1 : 0);
};

// Script'i çalıştır
if (require.main === module) {
    runAllTests().catch(error => {
        log(`💥 Test çalıştırma hatası: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { runAllTests, securityTests };


