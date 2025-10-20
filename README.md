# Restoran Sipariş Sistemi - Renk Kodlu Sipariş Takibi

Modern restoran sipariş yönetim sistemi ile gerçek zamanlı renk kodlu sipariş izleme özelliği.

## 🚀 Ana Özellik

### Renk Kodlu Sipariş Takibi
- **Gerçek Zamanlı İzleme**: Siparişler mutfak ve garson ekranlarında gerçek zamanlı olarak takip edilir
- **Renk Kodlaması**:
  - 🟢 **Yeşil**: 0-8 dakika (normal)
  - 🟡 **Sarı**: 8-12 dakika (dikkat)
  - 🔴 **Kırmızı**: 12+ dakika (gecikme - uyarı animasyonu)
- **Gecikme Uyarıları**: 12 dakikayı aşan siparişler için görsel uyarılar
- **Otomatik Hesaplama**: Sipariş hazırlama süreleri otomatik olarak hesaplanır

## 🛠️ Teknik Özellikler

### Backend (Node.js + Express)
- **Socket.IO**: Gerçek zamanlı güncellemeler
- **Moment.js**: Zaman hesaplamaları
- **Sipariş Takibi API'si**: Renk kodlu sipariş zaman takibi

### Frontend
- **Real-time Updates**: Socket.IO ile anlık güncellemeler
- **Responsive Design**: Mobil uyumlu tasarım
- **Color-coded UI**: Renk kodlu sipariş kartları

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 14.0.0 veya üzeri
- npm veya yarn

### Kurulum
```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start
```

### Erişim
- **Ana Sayfa**: http://localhost:3001
- **Garson Paneli**: http://localhost:3001/garson
- **Mutfak Paneli**: http://localhost:3001/mutfak
- **Kasa Paneli**: http://localhost:3001/kasa
- **Raporlar**: http://localhost:3001/raporlar
- **Stok Yönetimi**: http://localhost:3001/stok

## 👥 Kullanıcı Rolleri

### Admin Kullanıcı
- **Kullanıcı Adı**: `admin123`
- **Şifre**: `admin1235`
- **Erişim**: Tüm paneller

### Normal Kullanıcı
- **Kullanıcı Adı**: `isletme123`
- **Şifre**: `isletme1235`
- **Erişim**: Garson ve Mutfak panelleri

## 📈 API Endpoints

### Sipariş Takibi
- `GET /api/orders/timing` - Renk kodlu sipariş zaman takibi
- `GET /api/orders` - Tüm siparişleri listele
- `POST /api/orders` - Yeni sipariş oluştur
- `PUT /api/orders/:id/status` - Sipariş durumu güncelle

### Diğer API'ler
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/menu` - Menü bilgileri
- `GET /api/masalar` - Masa durumları
- `GET /api/stock` - Stok bilgileri

## 🎨 Renk Kodlaması

### Sipariş Durumları
- **Yeşil (0-8 dk)**: Normal süre
- **Sarı (8-12 dk)**: Dikkat gerektiren süre
- **Kırmızı (12+ dk)**: Gecikme (pulse animasyonu)

### Görsel Öğeler
- **Sipariş Kartları**: Sol kenar renk kodlaması
- **Zaman Göstergeleri**: Renk kodlu saat ikonları
- **Gecikme Uyarıları**: Kırmızı "GECİKME!" etiketi

## 🔧 Özelleştirme

### Zaman Limitleri
`server.js` dosyasında zaman limitlerini değiştirebilirsiniz:

```javascript
// Sipariş zaman takibi API'si içinde
if (elapsedMinutes <= 8) {
  timeStatus = 'green';
} else if (elapsedMinutes <= 12) {
  timeStatus = 'yellow';
} else {
  timeStatus = 'red';
}
```

## 📱 Mobil Uyumluluk

Sistem tamamen mobil uyumlu olarak tasarlanmıştır:
- Responsive grid layout
- Touch-friendly butonlar
- Mobil optimizasyonlu arayüz

## 🔒 Güvenlik

- **Kullanıcı Doğrulama**: Rol tabanlı erişim kontrolü
- **Input Sanitization**: XSS koruması
- **Session Management**: Güvenli oturum yönetimi

## 🐛 Hata Ayıklama

### Log Dosyaları
- Sunucu logları konsol çıktısında görüntülenir
- Socket.IO bağlantı durumları izlenir
- API hataları detaylı olarak loglanır

### Performans İzleme
- Sipariş hazırlama süreleri otomatik hesaplanır
- Geciken siparişler gerçek zamanlı tespit edilir
- 30 saniyede bir otomatik güncelleme

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## 📞 İletişim

Proje hakkında sorularınız için:
- **Email**: [email protected]
- **GitHub**: [Proje Sayfası](https://github.com/username/restoran-siparis-sistemi)

---

**Not**: Bu sistem tamamen dahili kullanım için tasarlanmıştır. Müşteriler bu özelliklere erişemez.
