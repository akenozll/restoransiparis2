// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

// Raporlar JavaScript
class RaporlarPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.orders = [];
        this.menu = { yemekler: [], icecekler: [] };
        this.masalar = [];
        this.charts = {};
        
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
        this.toggleCustomDateRange();
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
            
            // Sadece admin kullanıcıları raporlara erişebilir
            if (userData.role !== 'admin') {
                this.showAuthError('Bu panele erişim yetkiniz yok! Sadece admin kullanıcıları raporları görüntüleyebilir.');
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
                    <h1><i class="fas fa-chart-line"></i> Raporlar</h1>
                </div>
                <div class="auth-section">
                    <div class="auth-header">
                        <h2><i class="fas fa-exclamation-triangle"></i> Erişim Hatası</h2>
                        <p>${message}</p>
                    </div>
                    <div class="auth-form active">
                        <div style="text-align: center; padding: 20px;">
                            <p style="color: #f56565; font-size: 1.1rem; margin-bottom: 20px;">Bu panele erişmek için admin yetkisine sahip olmanız gerekiyor.</p>
                            <a href="/" class="btn btn-primary" style="display: inline-block; text-decoration: none;">
                                <i class="fas fa-home"></i> Ana Sayfaya Dön
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupSocketListeners() {
        this.socket.on('orderData', (orders) => {
            this.orders = orders;
            this.generateReport();
        });
        
        this.socket.on('menuData', (menu) => {
            this.menu = menu;
            this.generateReport();
        });
        
        this.socket.on('masaData', (masalar) => {
            this.masalar = masalar;
            this.generateReport();
        });
        
        this.socket.on('newOrder', (order) => {
            this.orders.push(order);
            this.generateReport();
        });
    }
    
    setupEventListeners() {
        // Filtre değişikliklerini dinle
        const timeRangeSelect = document.getElementById('timeRange');
        const reportTypeSelect = document.getElementById('reportType');
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', () => {
                this.toggleCustomDateRange();
                this.generateReport();
            });
        }
        
        if (reportTypeSelect) {
            reportTypeSelect.addEventListener('change', () => {
                this.generateReport();
            });
        }
        
        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                this.generateReport();
            });
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('change', () => {
                this.generateReport();
            });
        }
    }
    
    toggleCustomDateRange() {
        const timeRange = document.getElementById('timeRange');
        const customDateRange = document.getElementById('customDateRange');
        
        if (timeRange && customDateRange) {
            if (timeRange.value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
            }
        }
    }
    
    loadInitialData() {
        // Siparişleri yükle
        fetch(`${API_BASE_URL}/api/orders`)
            .then(response => response.json())
            .then(orders => {
                this.orders = orders;
                this.generateReport();
            })
            .catch(error => {
                console.error('Siparişler yüklenirken hata:', error);
                this.orders = [];
                this.generateReport();
            });
        
        // Menüyü yükle
        fetch(`${API_BASE_URL}/api/menu`)
            .then(response => response.json())
            .then(menu => {
                this.menu = menu;
                this.generateReport();
            })
            .catch(error => {
                console.error('Menü yüklenirken hata:', error);
                this.menu = { yemekler: [], icecekler: [] };
                this.generateReport();
            });
        
        // Masaları yükle
        fetch(`${API_BASE_URL}/api/masalar`)
            .then(response => response.json())
            .then(masalar => {
                this.masalar = masalar;
                this.generateReport();
            })
            .catch(error => {
                console.error('Masalar yüklenirken hata:', error);
                this.masalar = [];
                this.generateReport();
            });
    }
    
    loadUserInfo() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                const userInfo = document.getElementById('userInfo');
                if (userInfo) {
                    userInfo.textContent = `${userData.username} (${userData.role})`;
                }
            } catch (error) {
                console.error('Kullanıcı bilgisi yüklenirken hata:', error);
            }
        }
    }
    
    generateReport() {
        const timeRange = document.getElementById('timeRange')?.value || 'month';
        const reportType = document.getElementById('reportType')?.value || 'sales';
        const filteredOrders = this.filterOrdersByTimeRange(this.orders, timeRange);
        // Tüm ana bölümleri öncelikle gizle
        document.querySelectorAll('.report-sales, .report-revenue, .report-products, .report-tables').forEach(div => div.style.display='none');
        // Seçime göre sadece ilgili bölümü aç
        if(reportType==='sales') document.querySelector('.report-sales').style.display = 'block';
        else if(reportType==='revenue') document.querySelector('.report-revenue').style.display = 'block';
        else if(reportType==='products') document.querySelector('.report-products').style.display = 'block';
        else if(reportType==='tables') document.querySelector('.report-tables').style.display = 'block';
        else if(reportType==='all') document.querySelectorAll('.report-sales, .report-revenue, .report-products, .report-tables').forEach(div => div.style.display='block');
        // Sonra asıl fonksiyon çağrılarını yap
        if(reportType==='sales'||reportType==='all') {
            this.updateSummaryCards(filteredOrders);
            this.updateSalesChart(filteredOrders, timeRange);
            this.updateSalesTable(filteredOrders);
        }
        if(reportType==='products'||reportType==='all') {
            this.updateProductAnalysis(filteredOrders);
        }
        if(reportType==='tables'||reportType==='all') {
            this.updateTablePerformance(filteredOrders);
        }
        if(reportType==='revenue'||reportType==='all') {
            this.updateSummaryCards(filteredOrders);
        }
    }
    
    filterOrdersByTimeRange(orders, timeRange) {
        const now = new Date();
        let startDate = new Date(), endDate = new Date();
        switch (timeRange) {
            case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0); endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); break;
            case 'week': const dayOfWeek = now.getDay(); const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);
                endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999); break;
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); break;
            case 'custom':
                const startDateInput = document.getElementById('startDate')?.value;
                const endDateInput = document.getElementById('endDate')?.value;
                if (!startDateInput || !endDateInput) return [];
                startDate = new Date(startDateInput + 'T00:00:00');
                endDate = new Date(endDateInput + 'T23:59:59');
                break;
            default: return orders;
        }
        return orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            const paymentDate = order.paymentTimestamp ? new Date(order.paymentTimestamp) : null;
            // Eğer ödendi ise (paymentTimestamp), onu öncelikli date olarak kullan!
            if(paymentDate) return paymentDate >= startDate && paymentDate <= endDate;
            // Değilse sipariş oluşturma tarihi filtreye giriyorsa al.
            return orderDate >= startDate && orderDate <= endDate;
        });
    }
    
    updateSummaryCards(orders) {
        const totalOrders = orders.length;
        let totalRevenue = orders.reduce((sum, order) => {
            let orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            if(isNaN(orderTotal) || !isFinite(orderTotal) || orderTotal < 0) orderTotal = 0;
            return sum + orderTotal;
        }, 0);
        if(!isFinite(totalRevenue) || totalRevenue < 0) totalRevenue = 0;
        const averageOrder = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';
        const activeTables = this.masalar.filter(masa => masa.status === 'dolu').length;
        
        // Özet kartlarını güncelle
        const totalOrdersEl = document.getElementById('totalOrders');
        const totalRevenueEl = document.getElementById('totalRevenue');
        const averageOrderEl = document.getElementById('averageOrder');
        const activeTablesEl = document.getElementById('activeTables');
        
        if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
        if (totalRevenueEl) totalRevenueEl.textContent = totalRevenue.toFixed(2) + ' TL';
        if (averageOrderEl) averageOrderEl.textContent = averageOrder + ' TL';
        if (activeTablesEl) activeTablesEl.textContent = activeTables;
        
        console.log('Rapor hesaplamaları:', {
            totalOrders,
            totalRevenue,
            averageOrder,
            activeTables,
            orders: orders.length
        });
    }
    
    updateSalesChart(orders, timeRange) {
        const canvas = document.getElementById('salesChart');
        if (!canvas) return;
        if (this.charts.salesChart) { this.charts.salesChart.destroy(); canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); }
        if (!orders || !orders.length) {
            canvas.style.display = 'none';
            let parent = canvas.parentElement;
            parent && (parent.innerHTML = '<div class="empty-message">Bu tarih aralığında satış verisi yok.</div>');
            return;
        } else {
            canvas.style.display = 'block';
        }
        
        // Mevcut grafik varsa yok et
        // Tarih grupları oluştur
        const dateGroups = this.groupOrdersByDate(orders, timeRange);
        
        this.charts.salesChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: dateGroups.labels,
                datasets: [{
                    label: 'Satış (TL)',
                    data: dateGroups.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#2d3748'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#2d3748'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#2d3748'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    groupOrdersByDate(orders, timeRange) {
        const groups = {};
        
        orders.forEach(order => {
            const date = new Date(order.timestamp);
            let key;
            
            // Order total'ının sayı olduğundan emin ol
            const orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            
            switch (timeRange) {
                case 'today':
                    key = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                    break;
                case 'week':
                    key = date.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit' });
                    break;
                case 'month':
                    key = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
                    break;
                case 'year':
                    key = date.toLocaleDateString('tr-TR', { month: 'long' });
                    break;
                case 'custom':
                    key = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    break;
                default:
                    key = date.toLocaleDateString('tr-TR');
            }
            
            if (!groups[key]) {
                groups[key] = 0;
            }
            groups[key] += orderTotal;
        });
        
        // Tarih sırasına göre sırala
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (timeRange === 'today') {
                return new Date(`2000-01-01 ${a}`) - new Date(`2000-01-01 ${b}`);
            } else if (timeRange === 'week') {
                const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
                return weekDays.indexOf(a.split(' ')[0]) - weekDays.indexOf(b.split(' ')[0]);
            } else if (timeRange === 'month') {
                return new Date(`2000-${a.split('.')[1]}-${a.split('.')[0]}`) - new Date(`2000-${b.split('.')[1]}-${b.split('.')[0]}`);
            } else if (timeRange === 'year') {
                const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                return months.indexOf(a) - months.indexOf(b);
            } else if (timeRange === 'custom') {
                const dateA = new Date(a.split('.')[2], a.split('.')[1] - 1, a.split('.')[0]);
                const dateB = new Date(b.split('.')[2], b.split('.')[1] - 1, b.split('.')[0]);
                return dateA - dateB;
            }
            return 0;
        });
        
        return {
            labels: sortedKeys,
            data: sortedKeys.map(key => groups[key])
        };
    }
    
    updateSalesTable(orders) {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!orders.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #2d3748;">Bu tarih aralığında sipariş bulunamadı</td></tr>';
            return;
        }
        
        orders.slice(0, 10).forEach(order => {
            let orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            if(isNaN(orderTotal) || !isFinite(orderTotal) || orderTotal<0) orderTotal=0;
            const row = document.createElement('tr');
            const orderDate = new Date(order.timestamp);
            const itemCount = Array.isArray(order.items) ? order.items.length : 0;
            
            row.innerHTML = `
                <td>${order.masaName || 'Bilinmeyen Masa'}</td>
                <td>${itemCount} ürün</td>
                <td>${orderTotal.toFixed(2)} TL</td>
                <td>${orderDate.toLocaleString('tr-TR')}</td>
                <td><span class="status-badge ${order.status}">${this.getStatusText(order.status)}</span></td>
            `;
            tbody.appendChild(row);
        });
    }
    
    updateProductAnalysis(orders) {
        // En çok satan ürünleri hesapla
        const productSales = {};
        
        orders.forEach(order => {
            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item && item.name) {
                        if (!productSales[item.name]) {
                            productSales[item.name] = { quantity: 0, revenue: 0 };
                        }
                        let quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
                        let price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                        if(isNaN(quantity) || quantity<0) quantity=0;
                        if(isNaN(price) || price<0) price=0;
                        
                        productSales[item.name].quantity += quantity;
                        productSales[item.name].revenue += price * quantity;
                    }
                });
            }
        });
        
        // En çok satan 5 ürünü al
        // Sadece satış yapılan ürünleri göster (quantity > 0)
        const topProducts = Object.entries(productSales)
            .filter(([,d])=>d.quantity>0)
            .sort(([,a], [,b]) => b.quantity - a.quantity)
            .slice(0, 5);
        
        // Grafik güncelle
        this.updateTopProductsChart(topProducts);
        
        // Liste güncelle
        this.updateTopProductsList(topProducts);
    }
    
    updateTopProductsChart(topProducts) {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) return;
        if (this.charts.topProductsChart) { this.charts.topProductsChart.destroy(); canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); }
        if (!topProducts.length) {
            canvas.style.display = 'none';
            let parent = canvas.parentElement;
            parent && (parent.innerHTML = '<div class="empty-message">Bu tarih aralığında ürün satışı bulunamadı.</div>');
            return;
        } else {
            canvas.style.display = 'block';
        }
        
        this.charts.topProductsChart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: topProducts.map(([name]) => name),
                datasets: [{
                    data: topProducts.map(([, data]) => data.quantity),
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#2d3748'
                        }
                    }
                }
            }
        });
    }
    
    updateTopProductsList(topProducts) {
        const container = document.getElementById('topProductsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!topProducts.length) {
            container.innerHTML = '<p style="text-align: center; color: #2d3748;">Bu tarih aralığında ürün satışı bulunamadı</p>';
            return;
        }
        
        topProducts.forEach(([name, data], index) => {
            let quantity = (typeof data.quantity==='number' && data.quantity>0) ? data.quantity : 0;
            let revenue = (typeof data.revenue==='number' && data.revenue>0) ? data.revenue : 0;
            if(quantity===0) return;
            const item = document.createElement('div');
            item.className = 'top-product-item';
            item.innerHTML = `
                <div class="product-rank">${index + 1}</div>
                <div class="product-info">
                    <div class="product-name">${name}</div>
                    <div class="product-stats">
                        <span>${quantity} adet</span>
                        <span>${revenue.toFixed(2)} TL</span>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    updateTablePerformance(orders) {
        const tableStats = {};
        
        // Masa istatistiklerini hesapla
        orders.forEach(order => {
            const masaName = order.masaName || 'Bilinmeyen Masa';
            const orderTotal = typeof order.total === 'number' ? order.total : parseFloat(order.total) || 0;
            
            if (!tableStats[masaName]) {
                tableStats[masaName] = { orders: 0, revenue: 0 };
            }
            tableStats[masaName].orders++;
            tableStats[masaName].revenue += orderTotal;
        });
        
        // En aktif masaları göster
        const topTables = Object.entries(tableStats)
            .sort(([,a], [,b]) => b.revenue - a.revenue)
            .slice(0, 5);
        
        const container = document.getElementById('tablePerformance');
        if (!container) {
            console.error('Table performance container bulunamadı');
            return;
        }
        
        container.innerHTML = '';
        
        if (topTables.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #2d3748;">Bu tarih aralığında masa performansı bulunamadı</p>';
            return;
        }
        
        topTables.forEach(([tableName, stats], index) => {
            const item = document.createElement('div');
            item.className = 'table-performance-item';
            item.innerHTML = `
                <div class="table-rank">${index + 1}</div>
                <div class="table-info">
                    <div class="table-name">${tableName}</div>
                    <div class="table-stats">
                        <span>${stats.orders} sipariş</span>
                        <span>${stats.revenue.toFixed(2)} TL</span>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    getStatusText(status) {
        switch (status) {
            case 'mutfakta': return 'Mutfakta';
            case 'hazirlaniyor': return 'Hazırlanıyor';
            case 'hazir': return 'Hazır';
            case 'servise-cikti': return 'Servise Çıktı';
            case 'tamamlandi': return 'Tamamlandı';
            default: return status;
        }
    }
}

// Global fonksiyon
window.generateReport = function() {
    if (window.raporlarPanel) window.raporlarPanel.generateReport();
};

// MODAL LOGİĞİ
function updateClearBtnState() {
    const clearOrders = document.getElementById('clearOrders').checked;
    const clearRevenue = document.getElementById('clearRevenue').checked;
    const clearProductStats = document.getElementById('clearProductStats').checked;
    const clearMenu = document.getElementById('clearMenu').checked;
    document.getElementById('confirmClearData').disabled = !(clearOrders || clearRevenue || clearProductStats || clearMenu);
}

// Panel başlatma
let raporlarPanel;
document.addEventListener('DOMContentLoaded', function() {
    raporlarPanel = new RaporlarPanel();
    window.raporlarPanel = raporlarPanel;

    // Temizlik butonu işleyici
    const clearBtn = document.getElementById('clearDataBtn');
    const modal = document.getElementById('clearDataModal');
    const cancelBtn = document.getElementById('cancelClearData');
    const confirmBtn = document.getElementById('confirmClearData');
    const clearMsg = document.getElementById('clearMsg');
    document.getElementById('clearOrders').addEventListener('change', updateClearBtnState);
    document.getElementById('clearRevenue').addEventListener('change', updateClearBtnState);
    document.getElementById('clearProductStats').addEventListener('change', updateClearBtnState);
    document.getElementById('clearMenu').addEventListener('change', updateClearBtnState);
    updateClearBtnState();

    clearBtn && clearBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        clearMsg.innerHTML = '';
        updateClearBtnState();
    });
    cancelBtn && cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'none';
        clearMsg.innerHTML = '';
    });
    confirmBtn && confirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        confirmBtn.disabled = true;
        clearMsg.innerHTML = '<span style="color:#d97706;">İşlem yapılıyor...</span>';
        const clearOrders = document.getElementById('clearOrders').checked;
        const clearRevenue = document.getElementById('clearRevenue').checked;
        const clearProductStats = document.getElementById('clearProductStats').checked;
        const clearMenu = document.getElementById('clearMenu').checked;
        if (!(clearOrders || clearRevenue || clearProductStats || clearMenu)) {
            clearMsg.innerHTML = '<span style="color:#c53030;">En az bir seçenek seçmelisiniz!</span>';
            confirmBtn.disabled = false;
            return;
        }
        const ADMIN_TOKEN = 'changeme-safe-admin-token'; // Dilersen localStorage veya .env'den de çekilebilir
        // API isteği
        const result = await fetch(`${API_BASE_URL}/api/clear-data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${ADMIN_TOKEN}`
            },
            body: JSON.stringify({ orders: clearOrders, revenue: clearRevenue, productStats: clearProductStats, menu: clearMenu })
          })
          .then(x=>x.json()).catch(() => ({}));
        if(result && result.success) {
            clearMsg.innerHTML = '<span style="color:#059669;">Seçilen veriler başarıyla temizlendi!</span>';
            setTimeout(() => { modal.style.display = 'none'; clearMsg.innerHTML = ''; generateReport(); }, 1200);
        } else {
            clearMsg.innerHTML = '<span style="color:#c53030;">Bir hata oluştu!</span>';
            confirmBtn.disabled = false;
        }
    });
});
