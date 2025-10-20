// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

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
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
        this.loadUserInfo();
        this.requestNotificationPermission();
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
        
        this.menu.yemekler.forEach(item => {
            const menuItem = this.createMenuItem(item);
            yemekGrid.appendChild(menuItem);
        });
        
        // İçecekler
        const icecekGrid = document.getElementById('icecekGrid');
        icecekGrid.innerHTML = '';
        
        this.menu.icecekler.forEach(item => {
            const menuItem = this.createMenuItem(item);
            icecekGrid.appendChild(menuItem);
        });
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
                'Content-Type': 'application/json'
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
        const recentOrdersList = orders.slice(0, 5); // Son 5 sipariş
        
        if (recentOrdersList.length === 0) {
            recentOrders.innerHTML = '<p class="empty-message">Henüz sipariş yok</p>';
            return;
        }
        
        recentOrders.innerHTML = '';
        recentOrdersList.forEach(order => {
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            orderElement.innerHTML = `
                <div>
                    <strong>${order.masaName}</strong>
                    <div>${order.total.toFixed(2)} TL</div>
                </div>
                <div class="order-status ${order.status}">${order.status}</div>
            `;
            recentOrders.appendChild(orderElement);
        });
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
