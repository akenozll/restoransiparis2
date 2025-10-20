// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

// Mutfak Panel JavaScript
class MutfakPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.orders = [];
        this.selectedOrder = null;
        this.currentFilter = 'mutfakta';
        
        this.init();
    }
    
    init() {
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
    }
    
    setupSocketListeners() {
        this.socket.on('orderData', (orders) => {
            this.orders = orders;
            this.renderOrders();
            this.updateStats();
        });
        
        this.socket.on('newOrder', (order) => {
            this.orders.unshift(order);
            this.renderOrders();
            this.updateStats();
            
            // Yeni sipariş bildirimi
            this.showNotification(`Yeni sipariş: ${order.masaName}`);
        });
        
        this.socket.on('orderStatusUpdate', ({ id, status }) => {
            const order = this.orders.find(o => o.id == id);
            if (order) {
                order.status = status;
                this.renderOrders();
                this.updateStats();
                
                if (this.selectedOrder && this.selectedOrder.id == id) {
                    this.selectedOrder = order;
                    this.renderOrderDetail();
                }
            }
        });
    }
    
    setupEventListeners() {
        // Filtre butonları
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.status);
            });
        });
    }
    
    loadInitialData() {
        fetch(`${API_BASE_URL}/api/orders`)
            .then(response => response.json())
            .then(orders => {
                this.orders = orders;
                this.renderOrders();
                this.updateStats();
            });
    }
    
    setFilter(status) {
        this.currentFilter = status;
        
        // Aktif filtre butonunu güncelle
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-status="${status}"]`).classList.add('active');
        
        this.renderOrders();
    }
    
    renderOrders() {
        const activeOrders = document.getElementById('activeOrders');
        const filteredOrders = this.orders.filter(order => order.status === this.currentFilter);
        
        if (filteredOrders.length === 0) {
            activeOrders.innerHTML = '<p class="empty-message">Bu durumda sipariş bulunamadı</p>';
            return;
        }
        
        activeOrders.innerHTML = '';
        filteredOrders.forEach(order => {
            const orderCard = this.createOrderCard(order);
            activeOrders.appendChild(orderCard);
        });
    }
    
    createOrderCard(order) {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${this.selectedOrder && this.selectedOrder.id === order.id ? 'selected' : ''}`;
        
        // Zaman takibi için renk kodlaması
        const orderStartTime = new Date(order.orderStartTime || order.timestamp);
        const currentTime = new Date();
        const elapsedMinutes = Math.floor((currentTime - orderStartTime) / (1000 * 60));
        
        let timeStatus = 'normal';
        if (elapsedMinutes <= 8) {
            timeStatus = 'green';
        } else if (elapsedMinutes <= 12) {
            timeStatus = 'yellow';
        } else {
            timeStatus = 'red';
        }
        
        orderCard.classList.add(`time-${timeStatus}`);
        
        const orderTime = new Date(order.timestamp).toLocaleTimeString();
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        
        orderCard.innerHTML = `
            <h4>${order.masaName}</h4>
            <div class="order-time">${orderTime} - ${totalItems} ürün</div>
            <div class="order-timing ${timeStatus}">
                <i class="fas fa-clock"></i> ${elapsedMinutes} dk
                ${elapsedMinutes > 12 ? '<span class="delay-warning">GECİKME!</span>' : ''}
            </div>
            <div class="order-status ${order.status}">${this.getStatusText(order.status)}</div>
        `;
        
        orderCard.onclick = () => this.selectOrder(order);
        return orderCard;
    }
    
    selectOrder(order) {
        this.selectedOrder = order;
        
        // Seçili siparişi vurgula
        document.querySelectorAll('.order-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        this.renderOrderDetail();
        this.renderStatusUpdate();
    }
    
    renderOrderDetail() {
        const orderDetail = document.getElementById('orderDetail');
        
        if (!this.selectedOrder) {
            orderDetail.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-utensils"></i>
                    <p>Detay görmek için bir sipariş seçin</p>
                </div>
            `;
            return;
        }
        
        const order = this.selectedOrder;
        const orderTime = new Date(order.timestamp).toLocaleTimeString();
        
        orderDetail.innerHTML = `
            <div style="text-align: left;">
                <h4>${order.masaName}</h4>
                <p><strong>Sipariş Zamanı:</strong> ${orderTime}</p>
                <p><strong>Durum:</strong> <span class="order-status ${order.status}">${this.getStatusText(order.status)}</span></p>
                <p><strong>Toplam:</strong> ${order.total.toFixed(2)} TL</p>
                
                <div style="margin-top: 20px;">
                    <h5>Sipariş Detayları:</h5>
                    <div style="background: rgba(255, 255, 255, 0.9); padding: 15px; border-radius: 10px; margin-top: 10px; border: 1px solid rgba(255, 255, 255, 0.2);">
                        ${order.items.map(item => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #2d3748; font-weight: 600;">
                                <span>${item.name}</span>
                                <span>${item.quantity} x ${item.price.toFixed(2)} TL</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${order.aciklama ? `
                    <div style="margin-top: 20px;">
                        <h5>Notlar:</h5>
                        <p style="background: rgba(237, 137, 54, 0.1); padding: 10px; border-radius: 8px; color: #2d3748; font-weight: 600; border: 1px solid rgba(237, 137, 54, 0.3);">
                            ${order.aciklama}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderStatusUpdate() {
        const statusUpdate = document.getElementById('statusUpdate');
        
        if (!this.selectedOrder) {
            statusUpdate.innerHTML = '<div class="empty-message"><p>Durum güncellemek için sipariş seçin</p></div>';
            return;
        }
        
        const order = this.selectedOrder;
        const nextStatus = this.getNextStatus(order.status);
        
        if (!nextStatus) {
            statusUpdate.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #38a169; font-weight: 700; font-size: 1.2rem; margin-bottom: 10px;">Sipariş tamamlandı!</p>
                    <p style="color: #2d3748; font-weight: 600; font-size: 1rem;">Bu sipariş için başka işlem yapılamaz.</p>
                </div>
            `;
            return;
        }
        
        statusUpdate.innerHTML = `
            <div style="text-align: center;">
                <p style="margin-bottom: 20px; color: #2d3748; font-weight: 700; font-size: 1.1rem;"><strong>Mevcut Durum:</strong> ${this.getStatusText(order.status)}</p>
                <button class="btn btn-primary" onclick="mutfakPanel.updateOrderStatus('${nextStatus}')">
                    <i class="fas fa-arrow-right"></i> ${this.getStatusText(nextStatus)} Yap
                </button>
            </div>
        `;
    }
    
    getNextStatus(currentStatus) {
        const statusFlow = {
            'mutfakta': 'hazirlaniyor',
            'hazirlaniyor': 'hazir',
            'hazir': null
        };
        return statusFlow[currentStatus];
    }
    
    getStatusText(status) {
        const statusTexts = {
            'mutfakta': 'Mutfakta',
            'hazirlaniyor': 'Hazırlanıyor',
            'hazir': 'Hazır'
        };
        return statusTexts[status] || status;
    }
    
    updateOrderStatus(newStatus) {
        if (!this.selectedOrder) return;
        
        fetch(`${API_BASE_URL}/api/orders/${this.selectedOrder.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(updatedOrder => {
            this.selectedOrder = updatedOrder;
            this.renderOrderDetail();
            this.renderStatusUpdate();
            
            if (newStatus === 'hazir') {
                this.showCompletedModal(updatedOrder);
            }
        })
        .catch(error => {
            console.error('Durum güncellenirken hata:', error);
            alert('Durum güncellenirken bir hata oluştu!');
        });
    }
    
    updateStats() {
        const totalOrders = this.orders.length;
        const pendingOrders = this.orders.filter(order => order.status !== 'hazir').length;
        const completedOrders = this.orders.filter(order => order.status === 'hazir').length;
        
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('completedOrders').textContent = completedOrders;
    }
    
    showNotification(message) {
        // Basit bildirim
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4299e1;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    showCompletedModal(order) {
        const modal = document.getElementById('completedModal');
        const modalOrderInfo = document.getElementById('modalOrderInfo');
        
        modalOrderInfo.innerHTML = `
            <div class="order-success-notification-content">
                <div class="order-success-notification-header">
                    <h3><i class="fas fa-check-circle"></i> Sipariş Tamamlandı!</h3>
                </div>
                <div class="order-success-notification-body">
                    <p><strong>Masa:</strong> ${order.masaName}</p>
                    <p><strong>Toplam:</strong> ${order.total.toFixed(2)} TL</p>
                    <p><strong>Tamamlanma Zamanı:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// Global fonksiyonlar
function closeCompletedModal() {
    document.getElementById('completedModal').style.display = 'none';
}

// CSS Animasyonları
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Panel başlatma
let mutfakPanel;
document.addEventListener('DOMContentLoaded', function() {
    mutfakPanel = new MutfakPanel();
});
