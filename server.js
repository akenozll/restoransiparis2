const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');


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

// Veri saklama (gerçek uygulamada veritabanı kullanılır)
let orders = [
  {
    id: 1,
    masaName: 'Masa 1',
    items: [
      { name: 'Kebap', price: 45, quantity: 2 },
      { name: 'Su', price: 5, quantity: 2 }
    ],
    total: 100,
    status: 'tamamlandi',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 gün önce
    aciklama: 'Soslu kebap'
  },
  {
    id: 2,
    masaName: 'Masa 2',
    items: [
      { name: 'Pide', price: 35, quantity: 1 },
      { name: 'Çay', price: 8, quantity: 2 }
    ],
    total: 51,
    status: 'tamamlandi',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 saat önce
    aciklama: ''
  },
  {
    id: 3,
    masaName: 'Masa 3',
    items: [
      { name: 'Lahmacun', price: 25, quantity: 3 },
      { name: 'Ayran', price: 10, quantity: 3 }
    ],
    total: 105,
    status: 'hazir',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 saat önce
    aciklama: ''
  },
  {
    id: 4,
    masaName: 'Masa 1',
    items: [
      { name: 'Salata', price: 30, quantity: 1 },
      { name: 'Kahve', price: 12, quantity: 2 }
    ],
    total: 54,
    status: 'mutfakta',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 saat önce
    aciklama: 'Ekstra zeytinyağı'
  },
  {
    id: 5,
    masaName: 'Masa 4',
    items: [
      { name: 'Kebap', price: 45, quantity: 1 },
      { name: 'Kola', price: 15, quantity: 1 }
    ],
    total: 60,
    status: 'hazirlaniyor',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 saat önce
    aciklama: ''
  }
];

let users = [
  { id: 1, username: 'isletme123', email: 'isletme@restoran.com', password: 'isletme1235', role: 'user' },
  { id: 2, username: 'admin123', email: 'admin@restoran.com', password: 'admin1235', role: 'admin' }
];





let menu = {
  yemekler: [
    { id: 1, name: 'Kebap', price: 45, category: 'yemek', stock: 50, minStock: 10 },
    { id: 2, name: 'Pide', price: 35, category: 'yemek', stock: 30, minStock: 8 },
    { id: 3, name: 'Lahmacun', price: 25, category: 'yemek', stock: 40, minStock: 12 },
    { id: 4, name: 'Çorba', price: 20, category: 'yemek', stock: 25, minStock: 5 },
    { id: 5, name: 'Salata', price: 30, category: 'yemek', stock: 35, minStock: 8 }
  ],
  icecekler: [
    { id: 101, name: 'Su', price: 5, category: 'icecek', stock: 100, minStock: 20 },
    { id: 102, name: 'Çay', price: 8, category: 'icecek', stock: 80, minStock: 25 },
    { id: 103, name: 'Kahve', price: 12, category: 'icecek', stock: 40, minStock: 8 },
    { id: 104, name: 'Ayran', price: 10, category: 'icecek', stock: 45, minStock: 10 },
    { id: 105, name: 'Kola', price: 15, category: 'icecek', stock: 60, minStock: 15 }
  ]
};

let masalar = [
  { id: 1, name: 'Masa 1', status: 'boş' },
  { id: 2, name: 'Masa 2', status: 'boş' },
  { id: 3, name: 'Masa 3', status: 'boş' },
  { id: 4, name: 'Masa 4', status: 'boş' },
  { id: 5, name: 'Masa 5', status: 'boş' },
  { id: 6, name: 'Masa 6', status: 'boş' }
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

app.post('/api/orders', (req, res) => {
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

app.put('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const order = orders.find(o => o.id == id);
  if (order) {
    order.status = status;
    
    // Gerçek zamanlı güncelleme
    io.emit('orderStatusUpdate', { id, status });
    
    res.json(order);
  } else {
    res.status(404).json({ error: 'Sipariş bulunamadı' });
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

app.post('/api/stock/add-product', (req, res) => {
  try {
    const { name, category, price, stock, minStock, description } = req.body;
    
    const newProduct = {
      id: Date.now(),
      name: name,
      category: category,
      price: parseFloat(price),
      stock: parseInt(stock) || 100,
      minStock: parseInt(minStock) || 10,
      description: description || ''
    };
    
    // Kategoriye göre menüye ekle
    if (category === 'yemek') {
      menu.yemekler.push(newProduct);
    } else {
      menu.icecekler.push(newProduct);
    }
    
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
