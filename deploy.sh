#!/bin/bash

# 🚀 Restoran Sipariş Sistemi Deployment Script
# Bu script deployment sürecini otomatikleştirir

echo "🚀 Restoran Sipariş Sistemi Deployment Başlıyor..."

# 1. Backend URL'ini güncelle
echo "📝 Backend URL'ini güncelleyin:"
echo "   - public/main.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo "   - public/garson.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo "   - public/mutfak.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo "   - public/kasa.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo "   - public/raporlar.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo "   - public/stok.js dosyasında 'https://your-backend-url.onrender.com' yerine gerçek backend URL'inizi yazın"
echo ""

# 2. Backend deployment adımları
echo "🔧 Backend Deployment Adımları:"
echo "   1. https://render.com adresine git"
echo "   2. GitHub hesabınla kayıt ol"
echo "   3. 'New Web Service' butonuna tıkla"
echo "   4. GitHub repo'nu bağla"
echo "   5. Servis ayarları:"
echo "      - Name: restoran-siparis-backend"
echo "      - Environment: Node"
echo "      - Build Command: npm install"
echo "      - Start Command: npm start"
echo "   6. Environment Variables ekle:"
echo "      - NODE_ENV=production"
echo "      - PORT=10000"
echo "   7. 'Create Web Service' butonuna tıkla"
echo "   8. Backend URL'ini not al (örn: https://restoran-siparis-backend.onrender.com)"
echo ""

# 3. Frontend deployment adımları
echo "🌐 Frontend Deployment Adımları:"
echo "   1. Backend URL'ini tüm JS dosyalarında güncelle"
echo "   2. https://netlify.com adresine git"
echo "   3. 'public' klasörünü Netlify'a sürükle"
echo "   4. Veya GitHub ile deploy et:"
echo "      - 'New site from Git' seç"
echo "      - GitHub repo'nu seç"
echo "      - Publish directory: public"
echo ""

# 4. Test adımları
echo "🧪 Test Adımları:"
echo "   1. Netlify URL'ini ziyaret et"
echo "   2. Giriş yap (admin/admin1235 veya user/user123)"
echo "   3. Tüm panelleri test et"
echo "   4. Gerçek zamanlı özellikleri kontrol et"
echo ""

echo "✅ Deployment tamamlandı!"
echo "📞 Sorun yaşarsanız DEPLOYMENT.md dosyasına bakın."

