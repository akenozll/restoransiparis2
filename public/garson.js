// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';
const ADMIN_TOKEN = 'changeme-safe-admin-token';

// Garson Panel JavaScript
class GarsonPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.selectedMasa = null;
        this.currentOrder = [];
        this.menu = { yemekler: [], icecekler: [] };
        this.masalar = [];
        
        this.init();
    }
    
    init() {
        // Önce kullanıcı giriş kontrolü yap
        if (!this.checkUserAuth()) {
            return;
        }
        
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
        this.loadUserInfo();
        this.requestNotificationPermission();
    }
    
    checkUserAuth() {
        const user = localStorage.getItem('user');
        if (!user) {
            this.showAuthError();
            return false;
        }
        
        try {
            const userData = JSON.parse(user);
            if (!userData.username || !userData.role) {
                this.showAuthError();
                return false;
            }
            
            // Garson, admin ve user kullanıcıları erişebilir
            if (userData.role !== 'garson' && userData.role !== 'admin' && userData.role !== 'user') {
                this.showAuthError('Bu panele erişim yetkiniz yok!');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Kullanıcı verisi okunamadı:', error);
            this.showAuthError();
            return false;
        }
    }
    
    showAuthError(message = 'Giriş yapmanız gerekiyor!') {
        // Sayfayı temizle
        document.body.innerHTML = `
            <div class="container">
                <div class="header">
                    <h1><i class="fas fa-user-tie"></i> Garson Paneli</h1>
                </div>
                <div class="auth-section">
                    <div class="auth-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Erişim Hatası</h2>
                        <p>${message}</p>
                    </div>
                    <div class="auth-form active">
                        <div style="text-align: center; padding: 20px;">
                            <p style="color: #f56565; font-size: 1.1rem; margin-bottom: 20px;">Bu panele erişmek için giriş yapmanız gerekiyor.</p>
                            <a href="/" class="btn btn-primary" style="display: inline-block; text-decoration: none;">
                                <i class="fas fa-home"></i> Ana Sayfaya Dön
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    setupSocketListeners() {
        this.socket.on('menuData', (menu) => {
            this.menu = menu;
            this.renderMenu();
            // Menüyü sıfırlamışsak ekstra kullanıcıya popup bildirim göster
            if ((!menu.yemekler || menu.yemekler.length === 0) && (!menu.icecekler || menu.icecekler.length === 0)) {
                this.showNotification('Menü tamamen sıfırlandı! Devam etmek için yeni ürün ekleyin.', 'warning');
            }
        });
        
        this.socket.on('masaData', (masalar) => {
            this.masalar = masalar;
            this.renderMasalar();
        });
        
        this.socket.on('orderData', (orders) => {
            this.renderRecentOrders(orders);
        });
        
        this.socket.on('newOrder', (order) => {
            this.renderRecentOrders([order, ...this.getRecentOrders()]);
        });
        
        this.socket.on('masaUpdate', (masalar) => {
            this.masalar = masalar;
            this.renderMasalar();
        });
        // HAZIR sipariş bildirimi
        this.socket.on('orderReady', (order) => {
            this.showNotification(`Yeni Hazır Sipariş! ${order.masaName}`);
            // İstersek burada listede refresh de yapabiliriz: 
            this.renderRecentOrders([order, ...this.getRecentOrders()]);
        });
    }
    
    setupEventListeners() {
        // Tab değiştirme
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Sipariş gönderme
        document.getElementById('submitOrder').addEventListener('click', () => {
            this.submitOrder();
        });
        
        // Sipariş temizleme
        document.getElementById('clearOrder').addEventListener('click', () => {
            this.clearOrder();
        });

        // Sticky bar butonları (mobil)
        const stickySubmit = document.getElementById('stickySubmit');
        const stickyClear = document.getElementById('stickyClear');
        if (stickySubmit) stickySubmit.addEventListener('click', () => this.submitOrder());
        if (stickyClear) stickyClear.addEventListener('click', () => this.clearOrder());
    }
    
    loadInitialData() {
        // Menü ve masa verilerini yükle
        fetch(`${API_BASE_URL}/api/menu`)
            .then(response => response.json())
            .then(menu => {
                this.menu = menu;
                this.renderMenu();
            });
        
        fetch(`${API_BASE_URL}/api/masalar`)
            .then(response => response.json())
            .then(masalar => {
                this.masalar = masalar;
                this.renderMasalar();
            });
        
        fetch(`${API_BASE_URL}/api/orders`)
            .then(response => response.json())
            .then(orders => {
                this.renderRecentOrders(orders);
            });
    }
    
    loadUserInfo() {
        const user = localStorage.getItem('user');
        if (user) {
            this.currentUser = JSON.parse(user);
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = `${this.currentUser.username} (${this.currentUser.role})`;
            }
        }
    }
    
    switchTab(tabName) {
        // Tab butonlarını güncelle
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Tab içeriklerini güncelle
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }
    
    renderMasalar() {
        const masaGrid = document.getElementById('masaGrid');
        masaGrid.innerHTML = '';
        
        this.masalar.forEach(masa => {
            const masaItem = document.createElement('div');
            masaItem.className = `masa-item ${masa.status === 'dolu' ? 'dolu' : ''} ${this.selectedMasa === masa.id ? 'selected' : ''}`;
            masaItem.textContent = masa.name;
            masaItem.onclick = () => this.selectMasa(masa.id);
            masaGrid.appendChild(masaItem);
        });
    }
    
    renderMenu() {
        // Yemekler
        const yemekGrid = document.getElementById('yemekGrid');
        yemekGrid.innerHTML = '';
        if (!this.menu.yemekler || this.menu.yemekler.length === 0) {
            yemekGrid.innerHTML = '<div class="empty-message" style="text-align:center; color:#444;">Menüye hiç yemek ürünü eklenmemiş!</div>';
        } else {
            this.menu.yemekler.forEach(item => {
                const menuItem = this.createMenuItem(item);
                yemekGrid.appendChild(menuItem);
            });
        }
        // İçecekler
        const icecekGrid = document.getElementById('icecekGrid');
        icecekGrid.innerHTML = '';
        if (!this.menu.icecekler || this.menu.icecekler.length === 0) {
            icecekGrid.innerHTML = '<div class="empty-message" style="text-align:center; color:#444;">Menüye hiç içecek eklenmemiş!</div>';
        } else {
            this.menu.icecekler.forEach(item => {
                const menuItem = this.createMenuItem(item);
                icecekGrid.appendChild(menuItem);
            });
        }
    }
    
    createMenuItem(item) {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        menuItem.innerHTML = `
            <h4>${item.name}</h4>
            <div class="price">${item.price.toFixed(2)} TL</div>
            <div class="category">${item.category}</div>
        `;
        menuItem.onclick = () => this.addToOrder(item);
        return menuItem;
    }
    
    selectMasa(masaId) {
        // Tüm masalar seçilebilir olsun (dolu olsa bile)
        this.selectedMasa = masaId;
        this.renderMasalar();
        
        const masa = this.masalar.find(m => m.id === masaId);
        document.getElementById('selectedMasa').textContent = masa.name;
    }
    
    addToOrder(item) {
        if (!this.selectedMasa) {
            this.showNotification('Lütfen önce bir masa seçin!', 'warning');
            return;
        }
        
        const existingItem = this.currentOrder.find(orderItem => orderItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.currentOrder.push({
                ...item,
                quantity: 1
            });
        }
        
        this.renderOrderSummary();
    }
    
    renderOrderSummary() {
        const orderItems = document.getElementById('orderItems');
        const orderTotal = document.getElementById('orderTotal');
        
        if (this.currentOrder.length === 0) {
            orderItems.innerHTML = '<p class="empty-message">Henüz ürün seçilmedi</p>';
            orderTotal.textContent = '0.00 TL';
            return;
        }
        
        orderItems.innerHTML = '';
        let total = 0;
        
        this.currentOrder.forEach(item => {
            const orderItem = document.createElement('div');
            orderItem.className = 'order-item';
            orderItem.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    <div>${item.price.toFixed(2)} TL x ${item.quantity}</div>
                </div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="garsonPanel.updateQuantity(${item.id}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="garsonPanel.updateQuantity(${item.id}, 1)">+</button>
                </div>
            `;
            orderItems.appendChild(orderItem);
            total += item.price * item.quantity;
        });
        
        orderTotal.textContent = total.toFixed(2) + ' TL';
    }
    
    updateQuantity(itemId, change) {
        const item = this.currentOrder.find(orderItem => orderItem.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.currentOrder = this.currentOrder.filter(orderItem => orderItem.id !== itemId);
            }
            this.renderOrderSummary();
        }
    }
    
    submitOrder() {
        if (!this.selectedMasa) {
            this.showNotification('Lütfen bir masa seçin!', 'warning');
            return;
        }
        
        if (this.currentOrder.length === 0) {
            this.showNotification('Lütfen en az bir ürün seçin!', 'warning');
            return;
        }
        
        const orderData = {
            masaId: this.selectedMasa,
            items: this.currentOrder,
            aciklama: document.getElementById('orderNotes').value
        };
        
        fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            },
            body: JSON.stringify(orderData)
        })
        .then(response => response.json())
        .then(order => {
            this.showSuccessModal(order);
            this.clearOrder();
        })
        .catch(error => {
            console.error('Sipariş gönderilirken hata:', error);
            this.showNotification('Sipariş gönderilirken bir hata oluştu!', 'error');
        });
    }
    
    clearOrder() {
        this.currentOrder = [];
        this.selectedMasa = null;
        document.getElementById('orderNotes').value = '';
        document.getElementById('selectedMasa').textContent = 'Masa seçiniz';
        this.renderOrderSummary();
        this.renderMasalar();
    }
    
    showSuccessModal(order) {
        const modal = document.getElementById('successModal');
        const modalOrderDetails = document.getElementById('modalOrderDetails');
        
        modalOrderDetails.innerHTML = `
            <div class="order-success-notification">
                <h3>✅ Sipariş Başarılı!</h3>
                <div class="order-details">
                    <p><strong>Masa:</strong> ${order.masaName}</p>
                    <p><strong>Toplam:</strong> ${order.total.toFixed(2)} TL</p>
                    <p><strong>Zaman:</strong> ${new Date(order.timestamp).toLocaleTimeString()}</p>
                </div>
                <div class="total-amount">
                    Toplam: ${order.total.toFixed(2)} TL
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
    
    renderRecentOrders(orders) {
        const recentOrders = document.getElementById('recentOrders');
        // 3 kategoriye ayır
        const mutfaktaArr = orders.filter(order => order.status === 'mutfakta');
        const hazirlaniyorArr = orders.filter(order => order.status === 'hazirlaniyor');
        const hazirArr = orders.filter(order => order.status === 'hazir');

        recentOrders.innerHTML = `
            <div class="orders-category">
                <h4>Mutfakta</h4>
                <div id="ordersMutfakta">${mutfaktaArr.length === 0 ? '<p class=empty-message>Yok</p>' : ''}</div>
            </div>
            <div class="orders-category">
                <h4>Hazırlanıyor</h4>
                <div id="ordersHazirlaniyor">${hazirlaniyorArr.length === 0 ? '<p class=empty-message>Yok</p>' : ''}</div>
            </div>
            <div class="orders-category">
                <h4>Hazır</h4>
                <div id="ordersHazir">${hazirArr.length === 0 ? '<p class=empty-message>Yok</p>' : ''}</div>
            </div>
        `;
        // eski kart fonksiyonla ekle
        mutfaktaArr.forEach((order, index) => {
            const orderElement = this.createOrderBlock(order, index);
            document.getElementById('ordersMutfakta').appendChild(orderElement);
        });
        hazirlaniyorArr.forEach((order, index) => {
            const orderElement = this.createOrderBlock(order, index);
            document.getElementById('ordersHazirlaniyor').appendChild(orderElement);
        });
        hazirArr.forEach((order, index) => {
            const orderElement = this.createOrderBlock(order, index);
            document.getElementById('ordersHazir').appendChild(orderElement);
        });
    }
    createOrderBlock(order, index) {
        // İçerik renderı eski renderRecentOrders ile aynı yapıda olacak
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        const orderTime = new Date(order.timestamp);
        const now = new Date();
        const timeDiff = Math.floor((now - orderTime) / (1000 * 60));
        let timeText = '';
        if (timeDiff < 1) timeText = 'Az önce';
        else if (timeDiff < 60) timeText = `${timeDiff} dk önce`;
        else {const hours = Math.floor(timeDiff/60); timeText=`${hours} saat önce`;}
        let statusIcon = '', statusText = '';
        switch(order.status) {
            case 'mutfakta': statusIcon = '🔥'; statusText='Mutfakta'; break;
            case 'hazirlaniyor': statusIcon = '👨‍🍳'; statusText='Hazırlanıyor'; break;
            case 'hazir': statusIcon = '✅'; statusText='Hazır'; break;
            case 'servise-cikti': statusIcon = '🚀'; statusText='Servise Çıktı'; break;
            case 'tamamlandi': statusIcon = '🎉'; statusText='Tamamlandı'; break;
            default: statusIcon = '⏳'; statusText = order.status;
        }
        orderElement.innerHTML = `
            <div class="order-info">
                <div class="order-header">
                    <div class="order-masa">
                        <i class="fas fa-table"></i>
                        <strong>${order.masaName}</strong>
                    </div>
                    <div class="order-time">
                        <i class="fas fa-clock"></i> ${timeText}
                    </div>
                </div>
                <div class="order-details">
                    <div class="order-total"><i class="fas fa-lira-sign"></i> <span>${order.total.toFixed(2)} TL</span></div>
                    <div class="order-items-count"><i class="fas fa-utensils"></i> <span>${order.items ? order.items.length : 0} ürün</span></div>
                </div>
                ${order.aciklama ? `<div class="order-notes"><i class="fas fa-sticky-note"></i> ${order.aciklama}</div>` : ''}
            </div>
            <div class="order-status-container">
                <div class="order-status ${order.status}">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="status-text">${statusText}</span>
                </div>
            </div>
        `;
        orderElement.style.opacity = '0';
        orderElement.style.transform = 'translateY(20px)';
        setTimeout(() => {
            orderElement.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            orderElement.style.opacity = '1';
            orderElement.style.transform = 'translateY(0)';
        }, index * 100);
        return orderElement;
    }
    
    getRecentOrders() {
        // Son siparişleri al (basit implementasyon)
        return [];
    }
    
    showNotification(message, type = 'info') {
        // Modern notification sistemi
        if (Notification.permission === 'granted') {
            new Notification('Restoran Sipariş Sistemi', {
                body: message,
                icon: '/favicon.ico'
            });
        } else {
            // Fallback: console ve görsel bildirim
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Sayfada görsel bildirim göster
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#4caf50'};
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 1000;
                font-family: Arial, sans-serif;
                max-width: 300px;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // 3 saniye sonra kaldır
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }
}

// Global fonksiyonlar
function closeModal() {
    document.getElementById('successModal').style.display = 'none';
}

// Panel başlatma
let garsonPanel;
document.addEventListener('DOMContentLoaded', function() {
    garsonPanel = new GarsonPanel();
});
