// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

// Kasa Panel JavaScript
class KasaPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.orders = [];
        this.selectedOrder = null;
        this.currentFilter = 'hazir';
        
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
            this.updateDailySummary();
        });
        
        this.socket.on('newOrder', (order) => {
            this.orders.unshift(order);
            this.renderOrders();
            this.updateDailySummary();
        });
        
        this.socket.on('orderStatusUpdate', ({ id, status }) => {
            const order = this.orders.find(o => o.id == id);
            if (order) {
                order.status = status;
                this.renderOrders();
                this.updateDailySummary();
                
                if (this.selectedOrder && this.selectedOrder.id == id) {
                    this.selectedOrder = order;
                    this.renderOrderDetail();
                    this.renderPaymentSection();
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
                this.updateDailySummary();
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
        const paymentOrders = document.getElementById('paymentOrders');
        const filteredOrders = this.orders.filter(order => order.status === this.currentFilter);
        
        if (filteredOrders.length === 0) {
            paymentOrders.innerHTML = '<p class="empty-message">Bu durumda sipariş bulunamadı</p>';
            return;
        }
        
        paymentOrders.innerHTML = '';
        filteredOrders.forEach(order => {
            const paymentOrder = this.createPaymentOrder(order);
            paymentOrders.appendChild(paymentOrder);
        });
    }
    
    createPaymentOrder(order) {
        const paymentOrder = document.createElement('div');
        paymentOrder.className = `payment-order ${this.selectedOrder && this.selectedOrder.id === order.id ? 'selected' : ''}`;
        
        const orderTime = new Date(order.timestamp).toLocaleTimeString();
        const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
        
        paymentOrder.innerHTML = `
            <h4>${order.masaName}</h4>
            <div class="order-time">${orderTime} - ${totalItems} ürün</div>
            <div class="order-total">${order.total.toFixed(2)} TL</div>
        `;
        
        paymentOrder.onclick = () => this.selectOrder(order);
        return paymentOrder;
    }
    
    selectOrder(order) {
        this.selectedOrder = order;
        
        // Seçili siparişi vurgula
        document.querySelectorAll('.payment-order').forEach(paymentOrder => {
            paymentOrder.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        this.renderOrderDetail();
        this.renderPaymentSection();
    }
    
    renderOrderDetail() {
        const orderDetail = document.getElementById('orderDetail');
        
        if (!this.selectedOrder) {
            orderDetail.innerHTML = `
                <div class="empty-message">
                    <i class="fas fa-receipt"></i>
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
    
    renderPaymentSection() {
        const paymentSection = document.getElementById('paymentSection');
        
        if (!this.selectedOrder) {
            paymentSection.innerHTML = '<div class="empty-message"><p style="color: #2d3748; font-weight: 600; font-size: 1.1rem;">Ödeme almak için sipariş seçin</p></div>';
            return;
        }
        
        const order = this.selectedOrder;
        
        if (order.status !== 'hazir') {
            paymentSection.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p style="color: #e53e3e; font-weight: 700; font-size: 1.2rem; margin-bottom: 10px;">Bu sipariş henüz hazır değil!</p>
                    <p style="color: #2d3748; font-weight: 600; font-size: 1rem;">Sipariş durumu: ${this.getStatusText(order.status)}</p>
                </div>
            `;
            return;
        }
        
        paymentSection.innerHTML = `
            <div style="text-align: center;">
                <div class="cashier-summary">
                    <h3>Ödeme Detayları</h3>
                    <p><strong>Masa:</strong> ${order.masaName}</p>
                    <p><strong>Toplam Tutar:</strong> <span style="font-size: 1.5rem; color: #4299e1; font-weight: bold;">${order.total.toFixed(2)} TL</span></p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h5 style="color: #2d3748; font-weight: 600; margin-bottom: 15px;">Ödeme Yöntemi Seçin:</h5>
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                        <button class="btn btn-primary" onclick="kasaPanel.processPayment('nakit')">
                            <i class="fas fa-money-bill-wave"></i> Nakit
                        </button>
                        <button class="btn btn-primary" onclick="kasaPanel.processPayment('kart')">
                            <i class="fas fa-credit-card"></i> Kart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    getStatusText(status) {
        const statusTexts = {
            'mutfakta': 'Mutfakta',
            'hazirlaniyor': 'Hazırlanıyor',
            'hazir': 'Hazır',
            'odendi': 'Ödendi'
        };
        return statusTexts[status] || status;
    }
    
    processPayment(paymentMethod) {
        if (!this.selectedOrder) return;
        
        const order = this.selectedOrder;
        
        // Ödeme işlemi simülasyonu
        setTimeout(() => {
            // Sipariş durumunu güncelle
            fetch(`${API_BASE_URL}/api/orders/${order.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'odendi' })
            })
            .then(response => response.json())
            .then(updatedOrder => {
                this.selectedOrder = updatedOrder;
                this.renderOrderDetail();
                this.renderPaymentSection();
                this.showPaymentModal(updatedOrder, paymentMethod);
            })
            .catch(error => {
                console.error('Ödeme işlenirken hata:', error);
                alert('Ödeme işlenirken bir hata oluştu!');
            });
        }, 1000);
    }
    
    updateDailySummary() {
        const today = new Date().toDateString();
        const todayOrders = this.orders.filter(order => 
            new Date(order.timestamp).toDateString() === today
        );
        
        const totalRevenue = todayOrders
            .filter(order => order.status === 'odendi')
            .reduce((sum, order) => sum + order.total, 0);
        
        const totalOrders = todayOrders.length;
        const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2) + ' TL';
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('avgOrder').textContent = avgOrder.toFixed(2) + ' TL';
    }
    
    showPaymentModal(order, paymentMethod) {
        const modal = document.getElementById('paymentModal');
        const modalPaymentInfo = document.getElementById('modalPaymentInfo');
        
        const paymentMethodText = paymentMethod === 'nakit' ? 'Nakit' : 'Kredi Kartı';
        const paymentTime = new Date().toLocaleTimeString();
        
        modalPaymentInfo.innerHTML = `
            <div class="payment-complete-modal">
                <h3>✅ Ödeme Tamamlandı!</h3>
                <div class="order-details">
                    <p><strong>Masa:</strong> ${order.masaName}</p>
                    <p><strong>Ödeme Yöntemi:</strong> ${paymentMethodText}</p>
                    <p><strong>Ödeme Zamanı:</strong> ${paymentTime}</p>
                </div>
                <div class="total-amount">
                    Toplam: ${order.total.toFixed(2)} TL
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

// Global fonksiyonlar
function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function printReceipt() {
    // Fiş yazdırma simülasyonu
    const printWindow = window.open('', '_blank');
    const receiptContent = `
        <html>
        <head>
            <title>Fiş</title>
            <style>
                body { font-family: monospace; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total { border-top: 1px solid #000; padding-top: 10px; margin-top: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>RESTORAN SİPARİŞ SİSTEMİ</h2>
                <p>Fiş No: ${Date.now()}</p>
                <p>Tarih: ${new Date().toLocaleString('tr-TR')}</p>
            </div>
            
            <div class="items">
                ${kasaPanel.selectedOrder.items.map(item => `
                    <div class="item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>${(item.price * item.quantity).toFixed(2)} TL</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="total">
                <div class="item">
                    <span>TOPLAM:</span>
                    <span>${kasaPanel.selectedOrder.total.toFixed(2)} TL</span>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <p>Teşekkür ederiz!</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.print();
}

// Panel başlatma
let kasaPanel;
document.addEventListener('DOMContentLoaded', function() {
    kasaPanel = new KasaPanel();
});
