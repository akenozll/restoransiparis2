const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const fs = require('fs');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    }
});

// CORS ayarları - Tüm origin'lere izin ver (geliştirme için)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Hata ayıklama middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Tüm demo siparişler, demo menü ürünlerini kaldırıyoruz - gerçek kullanım için BOŞ veriyle başlasın!
const DATA_DIR = __dirname;
const MENU_PATH = path.join(DATA_DIR, 'menu.json');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const MASALAR_PATH = path.join(DATA_DIR, 'masalar.json');

function loadJsonSync(path, def) {
  try {
    if(fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf-8'));
    fs.writeFileSync(path, JSON.stringify(def));
    return def;
  } catch(e){ console.error('Dosya okuma hatası:', path, e); return def; }
}
function saveJsonSync(path, obj) {
  try { fs.writeFileSync(path, JSON.stringify(obj, null, 2)); } catch(e){ console.warn('Dosya yazma hatası:', path, e); }
}
function loadJsonSync2(path, def) {
  try { if(fs.existsSync(path)) return JSON.parse(fs.readFileSync(path, 'utf-8'));
    fs.writeFileSync(path, JSON.stringify(def)); return def; }
  catch(e){ console.error('Dosya okuma hatası:', path, e); return def; }
}
function saveJsonSync2(path, obj) {
  try { fs.writeFileSync(path, JSON.stringify(obj, null, 2)); } catch(e){ console.warn('Dosya yazma hatası:', path, e); }
}
// Kalıcı veri oku veya oluştur
let menu = loadJsonSync(MENU_PATH, { yemekler: [], icecekler: [] });
let orders = loadJsonSync(ORDERS_PATH, []);
let masalar = loadJsonSync2(MASALAR_PATH, [ { id: 1, name: 'Masa 1', status: 'boş' }, { id: 2, name: 'Masa 2', status: 'boş' } ]);

let users = [
  { id: 1, username: 'isletme123', email: 'isletme@restoran.com', password: 'isletme1235', role: 'user' },
  { id: 2, username: 'admin123', email: 'admin@restoran.com', password: 'admin1235', role: 'admin' }
];


// API Routes
app.get('/api/menu', (req, res) => {
  res.json(menu);
});

// Kullanıcı Giriş API'si
app.post('/api/auth/login', (req, res) => {
  console.log('Giriş isteği alındı:', req.body);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Eksik alanlar:', { username: !!username, password: !!password });
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir' });
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      console.log('Kullanıcı bulunamadı:', username);
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    
    console.log('Giriş başarılı:', user.username, 'Rol:', user.role);
    
    res.json({ 
      success: true, 
      message: 'Giriş başarılı!',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası oluştu' });
  }
});



app.get('/api/masalar', (req, res) => {
  res.json(masalar);
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'changeme-safe-admin-token';
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ') || auth.replace('Bearer ', '') !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Yetkin yok! (AUTH)' });
  }
  next();
}
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  // Temel XSS ve injection koruması: < > / \ ' " & karakterlerini zararsız yap
  return str.replace(/[<>&"'/\\]/g, '_');
}

// Sipariş ekle/güncelle kritik --- requireAuth uygulanmalı!
app.post('/api/orders', requireAuth, (req, res) => {
  const { masaId, items, aciklama } = req.body;
  
  const order = {
    id: Date.now(),
    masaId,
    masaName: masalar.find(m => m.id === masaId)?.name || `Masa ${masaId}`,
    items,
    aciklama,
    status: 'mutfakta',
    timestamp: new Date().toISOString(),
    total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };
  
  orders.push(order);
  saveJsonSync(ORDERS_PATH, orders);
  
  // Masa durumunu güncelle
  const masa = masalar.find(m => m.id === masaId);
  if (masa) {
    masa.status = 'dolu';
  }
  
  // Gerçek zamanlı güncelleme
  io.emit('newOrder', order);
  io.emit('masaUpdate', masalar);
  
  res.json(order);
});

app.put('/api/orders/:id/status', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, paymentTimestamp } = req.body;
  const order = orders.find(o => o.id == id);
  if (order) {
    order.status = status;
    if (paymentTimestamp) order.paymentTimestamp = paymentTimestamp;
    // Ödeme bitince ilgili masayı boşalt
    if (status === 'odendi') {
      // 1. Masa status 'boş'
      const masa = masalar.find(m => m.id === order.masaId);
      if(masa) masa.status = 'boş';
      saveJsonSync2(MASALAR_PATH, masalar);
      io.emit('masaData', masalar);
      // 2. Ürün stoklarını düşür!
      if (order.items && Array.isArray(order.items)) {
        const allItems = [...(menu.yemekler||[]), ...(menu.icecekler||[])];
        for (const siparisUrun of order.items) {
          const urun = allItems.find(prd => prd.id === siparisUrun.id || prd.name === siparisUrun.name);
          if (urun) {
            if (!urun.stock) urun.stock = 100;
            urun.stock = Math.max(0, urun.stock - (parseInt(siparisUrun.quantity)||1));
          }
        }
        saveJsonSync(MENU_PATH, menu);
        io.emit('menuData', menu);
      }
    }
    saveJsonSync(ORDERS_PATH, orders);
    io.emit('orderStatusUpdate', { id, status });
    res.json(order);
  } else {
    res.status(404).json({ error: 'Sipariş bulunamadı' });
  }
});

app.post('/api/clear-data', requireAuth, (req, res) => {
  try {
    const { orders: clearOrders, revenue: clearRevenue, productStats: clearProductStats, menu: clearMenu } = req.body;
    // Siparişleri Temizle
    if (clearOrders) { orders = []; saveJsonSync(ORDERS_PATH, orders); }
    // Ürün satış istatistiği global ise temizle (ör: productStats)
    if (clearProductStats && typeof global.productStats !== 'undefined') global.productStats = [];
    // Gelir ve ciroyu özel değişkende tutuyorsan, onları da temizle (ör: global.revenue)
    if (clearRevenue && typeof global.revenue !== 'undefined') global.revenue = 0;
    // MENÜ temizle
    if (clearMenu) {
      if(menu && menu.yemekler) menu.yemekler = [];
      if(menu && menu.icecekler) menu.icecekler = [];
      saveJsonSync(MENU_PATH, menu);
      io.emit('menuData', menu);
    }
    res.json({ success: true });
    io.emit('orderData', orders);
  } catch (error) {
    console.error('Temizleme hatası:', error);
    res.status(500).json({ success: false, message: 'Temizlerken sunucu hatası.' });
  }
});


// Stok yönetimi API'leri
app.get('/api/stock', (req, res) => {
  try {
    const stockData = {
      products: [...menu.yemekler, ...menu.icecekler].map(product => ({
        ...product,
        stock: product.stock || 100,
        minStock: product.minStock || 10
      }))
    };
    res.json(stockData);
  } catch (error) {
    console.error('Stok verisi getirme hatası:', error);
    res.status(500).json({ error: 'Stok verisi alınamadı' });
  }
});

app.post('/api/stock/update', (req, res) => {
  try {
    const { productId, stockChange, note } = req.body;
    
    // Ürünü bul
    const allProducts = [...menu.yemekler, ...menu.icecekler];
    const product = allProducts.find(p => p.id === parseInt(productId));
    
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    // Stok güncelle
    if (!product.stock) product.stock = 100;
    product.stock = Math.max(0, product.stock + stockChange);
    
    // Stok geçmişi kaydet
    if (!product.stockHistory) product.stockHistory = [];
    product.stockHistory.push({
      date: new Date(),
      change: stockChange,
      newStock: product.stock,
      note: note || '',
      user: 'Kullanıcı'
    });
    
    // Socket.IO ile güncelleme gönder
    io.emit('stockUpdate', { productId, newStock: product.stock });
    
    res.json({ success: true, newStock: product.stock });
  } catch (error) {
    console.error('Stok güncelleme hatası:', error);
    res.status(500).json({ error: 'Stok güncellenemedi' });
  }
});

app.post('/api/stock/add-product', requireAuth, (req, res) => {
  try {
    const { name, category, price, stock, minStock, description } = req.body;
    
    // sanitize
    const newProduct = {
      id: Date.now(),
      name: sanitizeInput(name),
      category: sanitizeInput(category),
      price: parseFloat(price),
      stock: parseInt(stock) || 100,
      minStock: parseInt(minStock) || 10,
      description: sanitizeInput(description || '')
    };
    
    // Kategoriye göre menüye ekle
    if (category === 'yemek') {
      menu.yemekler.push(newProduct);
    } else {
      menu.icecekler.push(newProduct);
    }
    saveJsonSync(MENU_PATH, menu);
    
    // Socket.IO ile yeni ürün bildirimi
    io.emit('newProduct', newProduct);
    
    res.json({ success: true, product: newProduct });
  } catch (error) {
    console.error('Ürün ekleme hatası:', error);
    res.status(500).json({ error: 'Ürün eklenemedi' });
  }
});

app.get('/api/stock/report', (req, res) => {
  try {
    const allProducts = [...menu.yemekler, ...menu.icecekler];
    const report = {
      date: new Date().toLocaleString('tr-TR'),
      totalProducts: allProducts.length,
      lowStock: allProducts.filter(p => {
        const stock = p.stock || 100;
        const minStock = p.minStock || 10;
        return stock > 0 && stock <= minStock;
      }).length,
      outOfStock: allProducts.filter(p => (p.stock || 100) === 0).length,
      totalValue: allProducts.reduce((sum, p) => sum + ((p.stock || 100) * p.price), 0),
      products: allProducts.map(p => ({
        name: p.name,
        category: p.category,
        stock: p.stock || 100,
        minStock: p.minStock || 10,
        price: p.price,
        totalValue: (p.stock || 100) * p.price,
        status: p.stock === 0 ? 'out' : (p.stock <= (p.minStock || 10) ? 'low' : 'normal')
      }))
    };
    
    res.json(report);
  } catch (error) {
    console.error('Stok raporu hatası:', error);
    res.status(500).json({ error: 'Rapor oluşturulamadı' });
  }
});


// Masa Ekleme Endpoint
app.post('/api/masalar/add', requireAuth, (req, res) => {
  try {
    let name = sanitizeInput(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Masa adı zorunlu!' });
    let newId = masalar.length > 0 ? Math.max(...masalar.map(m => m.id)) + 1 : 1;
    let yeniMasa = { id: newId, name: name, status: 'boş' };
    masalar.push(yeniMasa);
    saveJsonSync2(MASALAR_PATH, masalar);
    io.emit('masaData', masalar);
    res.json({ success: true, masa: yeniMasa });
  } catch (e) {
    res.status(500).json({ error: 'Masa eklerken hata.' });
  }
});

// Masa Silme Endpoint
app.delete('/api/masalar/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const masaIndex = masalar.findIndex(m => m.id === id);
    if (masaIndex === -1) return res.status(404).json({ error: 'Masa bulunamadı!' });

    // Aktif sipariş kontrolü
    const aktifOrder = orders.find(order => order.masaId === id && order.status !== 'odendi');
    if (aktifOrder) {
      return res.status(400).json({ error: 'Bu masada henüz ödenmemiş/aktif sipariş var! Önce siparişi kapatınız.' });
    }

    masalar.splice(masaIndex, 1);
    saveJsonSync2(MASALAR_PATH, masalar);
    io.emit('masaData', masalar);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Masa silmede hata.' });
  }
});


// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Garson sayfası
app.get('/garson', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'garson.html'));
});

// Mutfak sayfası
app.get('/mutfak', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mutfak.html'));
});

// Kasa sayfası
app.get('/kasa', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kasa.html'));
});

// Raporlar sayfası
app.get('/raporlar', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'raporlar.html'));
});

// Stok sayfası
app.get('/stok', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stok.html'));
});



// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
  console.log('Yeni bağlantı:', socket.id);
  
  // Mevcut verileri gönder
  socket.emit('menuData', menu);
  socket.emit('masaData', masalar);
  socket.emit('orderData', orders);
  
  socket.on('disconnect', () => {
    console.log('Bağlantı koptu:', socket.id);
  });
});

// Environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Ana Sayfa: http://localhost:${PORT}`);
  console.log(`Garson: http://localhost:${PORT}/garson`);
  console.log(`Mutfak: http://localhost:${PORT}/mutfak`);
  console.log(`Kasa: http://localhost:${PORT}/kasa`);
  console.log(`Raporlar: http://localhost:${PORT}/raporlar`);
  console.log(`Stok: http://localhost:${PORT}/stok`);
});
