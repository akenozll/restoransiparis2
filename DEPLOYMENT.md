# 🚀 Deployment Rehberi

Bu rehber, restoran sipariş sistemini production ortamına deploy etmek için adım adım talimatları içerir.

## 📋 Genel Bakış

Sistem iki parçadan oluşur:
- **Backend**: Node.js + Express + Socket.IO (API ve gerçek zamanlı iletişim)
- **Frontend**: HTML + CSS + JavaScript (Kullanıcı arayüzü)

**Özellikler:**
- ✅ Renk kodlu sipariş takibi (0-8 dk yeşil, 8-12 dk sarı, 12+ dk kırmızı)
- ✅ Gerçek zamanlı sipariş yönetimi
- ✅ Garson, mutfak, kasa panelleri
- ✅ Stok yönetimi
- ✅ Satış raporları

## 🔧 Backend Deployment

### Seçenek 1: Render.com (Önerilen - Ücretsiz)

1. **Render.com'a kayıt ol**
   - https://render.com adresine git
   - GitHub hesabınla kayıt ol

2. **Yeni Web Service oluştur**
   - "New Web Service" butonuna tıkla
   - GitHub repo'nu bağla
   - Repo'yu seç

3. **Servis ayarları:**
   ```
   Name: restoran-siparis-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Environment Variables ekle:**
   ```
   NODE_ENV=production
   PORT=10000
   ```

5. **Deploy et**
   - "Create Web Service" butonuna tıkla
   - Deployment tamamlanana kadar bekle

6. **Backend URL'ini not al**
   - Örnek: `https://restoran-siparis-backend.onrender.com`

### Seçenek 2: Railway.app

1. **Railway.app'e git**
2. **GitHub repo'nu bağla**
3. **Otomatik deploy**

### Seçenek 3: Heroku

1. **Heroku CLI kur**
2. **Heroku app oluştur**
3. **Deploy et**

## 🌐 Frontend Deployment (Netlify)

### Adım 1: Backend URL'ini Güncelle

Backend deploy edildikten sonra, frontend dosyalarındaki API URL'lerini güncelle:

**public/main.js dosyasında:**
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://your-backend-url.onrender.com'; // Backend URL'inizi buraya yazın
```

**public/garson.js dosyasında:**
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://your-backend-url.onrender.com'; // Backend URL'inizi buraya yazın
```

**Diğer JS dosyalarında da aynı şekilde güncelle:**
- mutfak.js
- kasa.js
- raporlar.js
- stok.js

### Adım 2: Netlify'a Yükle

#### Yöntem 1: Drag & Drop (En Kolay)

1. **Netlify.com'a git**
2. **public klasörünü sürükle**
3. **Otomatik deploy**

#### Yöntem 2: GitHub ile

1. **Repo'yu GitHub'a push et**
2. **Netlify'da "New site from Git" seç**
3. **GitHub repo'yu seç**
4. **Publish directory**: `public` olarak ayarla
5. **Deploy et**

### Adım 3: CORS Ayarları

Backend'de CORS ayarları otomatik olarak yapılandırılmıştır. Ek ayar gerekmez.

## 🔒 Güvenlik Ayarları

### Environment Variables

Backend'de şu environment variables'ları ayarla:

```bash
NODE_ENV=production
PORT=10000
```

### CORS Güvenliği

Sistem otomatik olarak güvenli CORS ayarları ile yapılandırılmıştır:
- Development: Tüm origin'lere izin
- Production: Sadece güvenilir domain'lere izin

## 📱 Mobil Uyumluluk

Sistem zaten mobil uyumlu olarak tasarlanmıştır. Ek ayar gerekmez.

## 🔍 Test Etme

### Backend Test

```bash
# API endpoint'lerini test et
curl https://your-backend-url.onrender.com/api/menu
curl https://your-backend-url.onrender.com/api/masalar
```

### Frontend Test

1. **Netlify URL'ini ziyaret et**
2. **Giriş yap:**
   - Admin: `admin123` / `admin1235`
   - User: `isletme123` / `isletme1235`
3. **Tüm panelleri test et**
4. **Gerçek zamanlı özellikleri kontrol et**

## 🐛 Sorun Giderme

### Backend Sorunları

1. **Port hatası**: Environment variable'da PORT ayarla
2. **CORS hatası**: Origin listesini kontrol et
3. **Socket.IO hatası**: CORS ayarlarını güncelle

### Frontend Sorunları

1. **API bağlantı hatası**: API_BASE_URL'i kontrol et
2. **Socket.IO bağlantı hatası**: Backend URL'ini kontrol et
3. **CORS hatası**: Backend CORS ayarlarını kontrol et

### Giriş Yapmama Sorunu

1. **Backend URL'ini kontrol et**: Tüm JS dosyalarında doğru backend URL'i olduğundan emin ol
2. **CORS ayarlarını kontrol et**: Backend'de CORS ayarlarının doğru olduğundan emin ol
3. **Console loglarını kontrol et**: Browser'da F12 > Console'da hata mesajlarını kontrol et
4. **Network tab'ını kontrol et**: F12 > Network'te API çağrılarının başarılı olduğunu kontrol et

## 📊 Monitoring

### Backend Monitoring

- **Render.com**: Built-in monitoring
- **Railway.app**: Built-in monitoring
- **Heroku**: Built-in monitoring

### Frontend Monitoring

- **Netlify**: Built-in analytics
- **Google Analytics**: Eklenebilir

## 🔄 Güncelleme

### Backend Güncelleme

1. **Kodu güncelle**
2. **GitHub'a push et**
3. **Otomatik redeploy**

### Frontend Güncelleme

1. **Kodu güncelle**
2. **GitHub'a push et**
3. **Netlify otomatik redeploy**

## 💰 Maliyet

### Ücretsiz Seçenekler

- **Backend**: Render.com, Railway.app
- **Frontend**: Netlify
- **Domain**: Netlify subdomain

### Ücretli Seçenekler

- **Backend**: Heroku, DigitalOcean
- **Frontend**: Custom domain
- **SSL**: Netlify'da ücretsiz

## 📞 Destek

Sorun yaşarsanız:

1. **Console loglarını kontrol et**
2. **Network tab'ını kontrol et**
3. **CORS ayarlarını kontrol et**
4. **Environment variables'ları kontrol et**
5. **Backend URL'lerini kontrol et**

---

**Not**: Bu rehber production deployment için hazırlanmıştır. Development ortamında localhost kullanmaya devam edebilirsiniz.
