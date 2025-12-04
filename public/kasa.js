// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';
const ADMIN_TOKEN = 'changeme-safe-admin-token';

// Kasa Panel JavaScript
class KasaPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.orders = [];
        this.masalar = [];
        this.selectedOrder = null;
        this.currentFilter = 'hazir';
        
        this.init();
    }
    
    init() {
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
        this.loadMasalar();
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ADMIN_TOKEN}`
                },
                body: JSON.stringify({ status: 'odendi', paymentTimestamp: new Date().toISOString() })
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

    loadMasalar() {
        fetch(`${API_BASE_URL}/api/masalar`)
            .then(r=>r.json())
            .then(masalar=>{
                this.masalar = masalar;
                this.renderMasaListesi();
            });
        // Gerçek zamanlı güncelleme (Socket)
        this.socket.on('masaData', (masalar) => {
            this.masalar = masalar;
            this.renderMasaListesi();
        });
    }
    renderMasaListesi() {
        const grid = document.getElementById('masaGrid');
        const warning = document.getElementById('masaSilWarning');
        warning.textContent = '';
        if (!grid) return;
        grid.innerHTML = '';
        this.masalar.forEach(masa => {
            const card = document.createElement('div');
            card.className = 'masa-item' + (masa.status === 'dolu' ? ' dolu' : '');
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.style.gap = '8px';
            card.style.background = masa.status==='dolu' ? 'linear-gradient(135deg,#ffe6e6,#ffc1c1)' : 'linear-gradient(135deg,#e6ffe6,#c1ffd7)';
            card.style.border = masa.status==='dolu' ? '2px solid #e53e3e':'2px solid #38a169';
            card.style.borderRadius = '18px';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.09)';
            card.style.padding = '20px 12px';
            card.style.margin = '6px';
            card.style.width = '100%';
            card.style.maxWidth = '170px';
            card.innerHTML = `<span style="font-weight:700;font-size:1.13em;">${masa.name}</span> <span style="color:${masa.status==='dolu'?'#e53e3e':'#38a169'};font-weight:600;">${masa.status==='dolu'?'DOLU':'BOŞ'}</span>`;
            const btn = document.createElement('button');
            btn.textContent = "Sil";
            btn.className = masa.status==='dolu' ? 'btn btn-danger btn-small' : 'btn btn-primary btn-small';
            btn.style.width = '80px';
            btn.disabled = masa.status==='dolu';
            btn.onclick = () => this.gosterSilModal(masa.id, masa.name);
            card.appendChild(btn);
            grid.appendChild(card);
        });
    }
    gosterSilModal(id, name) {
        silinecekMasaId = id;
        silinecekMasaName = name;
        document.getElementById('deleteMasaText').innerHTML = `<b>${name}</b> masasını silmek istediğinize emin misiniz? <br>Bu işlem geri alınamaz.`;
        document.getElementById('deleteMasaModal').style.display = 'block';
    }
    kapatSilModal() {
        silinecekMasaId = null;
        silinecekMasaName = null;
        document.getElementById('deleteMasaModal').style.display = 'none';
    }
    silMasaWithModal() {
        if (!silinecekMasaId) return this.kapatSilModal();
        const warning = document.getElementById('masaSilWarning');
        warning.textContent = '';
        const confirmBtn = document.getElementById('deleteMasaConfirmBtn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Siliniyor...';
        fetch(`${API_BASE_URL}/api/masalar/${silinecekMasaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
        })
        .then(async res => {
            let result = null;
            try { result = await res.json(); }
            catch { result = {error: 'Sunucu JSON döndüremedi!'} }
            if(!res.ok) throw new Error(result.error||'Masa silinemedi');
            this.loadMasalar();
            this.kapatSilModal();
        })
        .catch(err => {
            warning.textContent = err.message;
        })
        .finally(()=>{
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Sil';
        });
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
let silinecekMasaId = null;
let silinecekMasaName = null;

document.addEventListener('DOMContentLoaded', function() {
    kasaPanel = new KasaPanel();

    // Masa ekle FAB/Modal
    const fab = document.getElementById('addMasaFab');
    const modal = document.getElementById('addMasaModal');
    const saveBtn = document.getElementById('addMasaSaveBtn');
    const cancelBtn = document.getElementById('addMasaCancelBtn');
    const input = document.getElementById('yeniMasaAdi');
    const warning = document.getElementById('masaAddWarning');

    if (fab) fab.onclick = () => {
        modal.style.display = 'block';
        warning.textContent = '';
        input.value = '';
    };
    if (cancelBtn) cancelBtn.onclick = () => {
        modal.style.display = 'none';
        input.value = '';
        warning.textContent = '';
    };
    if (saveBtn) saveBtn.onclick = async () => {
        warning.textContent = '';
        const masaAdi = input.value.trim();
        if (!masaAdi) {
            warning.textContent = 'Masa adı zorunlu!'; return;
        }
        saveBtn.disabled = true;
        warning.textContent = 'Kaydediliyor...';
        try {
            const resp = await fetch(`${API_BASE_URL}/api/masalar/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_TOKEN}` },
                body: JSON.stringify({ name: masaAdi })
            });
            let sonuc = null;
            try { sonuc = await resp.json(); }
            catch { sonuc = { error: 'Sunucu JSON döndüremedi!' }; }
            if (!resp.ok || !sonuc.success) {
                warning.textContent = sonuc.error || 'Masa eklenemedi.'; return;
            }
            modal.style.display = 'none';
            input.value = '';
            warning.textContent = '';
            kasaPanel.loadMasalar();
        } catch (e) {
            warning.textContent = "Bir hata oluştu: " + (e.message || e);
        }
        saveBtn.disabled = false;
    }

    // MASA SİL MODAL BUTTON EVENTS
    const silCancel = document.getElementById('deleteMasaCancelBtn');
    const silConfirm = document.getElementById('deleteMasaConfirmBtn');
    silCancel && (silCancel.onclick = () => kasaPanel.kapatSilModal());
    silConfirm && (silConfirm.onclick = () => kasaPanel.silMasaWithModal());
});
