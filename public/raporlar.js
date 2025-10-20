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
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
        this.loadUserInfo();
        this.toggleCustomDateRange();
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
        
        // Tarih filtresi uygula
        const filteredOrders = this.filterOrdersByTimeRange(this.orders, timeRange);
        
        // Özet kartları güncelle
        this.updateSummaryCards(filteredOrders);
        
        // Satış grafiği güncelle
        this.updateSalesChart(filteredOrders, timeRange);
        
        // Satış tablosu güncelle
        this.updateSalesTable(filteredOrders);
        
        // Ürün analizi güncelle
        this.updateProductAnalysis(filteredOrders);
        
        // Masa performansı güncelle
        this.updateTablePerformance(filteredOrders);
    }
    
    filterOrdersByTimeRange(orders, timeRange) {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch (timeRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday, 0, 0, 0, 0);
                endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            case 'custom':
                const startDateInput = document.getElementById('startDate')?.value;
                const endDateInput = document.getElementById('endDate')?.value;
                
                if (startDateInput && endDateInput) {
                    startDate = new Date(startDateInput + 'T00:00:00');
                    endDate = new Date(endDateInput + 'T23:59:59');
                } else {
                    return orders;
                }
                break;
            default:
                return orders;
        }
        
        return orders.filter(order => {
            const orderDate = new Date(order.timestamp);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }
    
    updateSummaryCards(orders) {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrder = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;
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
    }
    
    updateSalesChart(orders, timeRange) {
        const canvas = document.getElementById('salesChart');
        if (!canvas) {
            console.error('Sales chart canvas bulunamadı');
            return;
        }
        
        // Mevcut grafik varsa yok et
        if (this.charts.salesChart) {
            this.charts.salesChart.destroy();
        }
        
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
            groups[key] += order.total;
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
        if (!tbody) {
            console.error('Sales table body bulunamadı');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #2d3748;">Bu tarih aralığında sipariş bulunamadı</td></tr>';
            return;
        }
        
        orders.slice(0, 10).forEach(order => {
            const row = document.createElement('tr');
            const orderDate = new Date(order.timestamp);
            
            row.innerHTML = `
                <td>${order.masaName}</td>
                <td>${order.items.length} ürün</td>
                <td>${order.total.toFixed(2)} TL</td>
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
            order.items.forEach(item => {
                if (!productSales[item.name]) {
                    productSales[item.name] = { quantity: 0, revenue: 0 };
                }
                productSales[item.name].quantity += item.quantity;
                productSales[item.name].revenue += item.price * item.quantity;
            });
        });
        
        // En çok satan 5 ürünü al
        const topProducts = Object.entries(productSales)
            .sort(([,a], [,b]) => b.quantity - a.quantity)
            .slice(0, 5);
        
        // Grafik güncelle
        this.updateTopProductsChart(topProducts);
        
        // Liste güncelle
        this.updateTopProductsList(topProducts);
    }
    
    updateTopProductsChart(topProducts) {
        const canvas = document.getElementById('topProductsChart');
        if (!canvas) {
            console.error('Top products chart canvas bulunamadı');
            return;
        }
        
        if (this.charts.topProductsChart) {
            this.charts.topProductsChart.destroy();
        }
        
        if (topProducts.length === 0) {
            canvas.style.display = 'none';
            return;
        }
        
        canvas.style.display = 'block';
        
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
        if (!container) {
            console.error('Top products list container bulunamadı');
            return;
        }
        
        container.innerHTML = '';
        
        if (topProducts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #2d3748;">Bu tarih aralığında ürün satışı bulunamadı</p>';
            return;
        }
        
        topProducts.forEach(([name, data], index) => {
            const item = document.createElement('div');
            item.className = 'top-product-item';
            item.innerHTML = `
                <div class="product-rank">${index + 1}</div>
                <div class="product-info">
                    <div class="product-name">${name}</div>
                    <div class="product-stats">
                        <span>${data.quantity} adet</span>
                        <span>${data.revenue.toFixed(2)} TL</span>
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
            if (!tableStats[order.masaName]) {
                tableStats[order.masaName] = { orders: 0, revenue: 0 };
            }
            tableStats[order.masaName].orders++;
            tableStats[order.masaName].revenue += order.total;
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
function generateReport() {
    if (window.raporlarPanel) {
        window.raporlarPanel.generateReport();
    }
}

// Panel başlatma
let raporlarPanel;
document.addEventListener('DOMContentLoaded', function() {
    raporlarPanel = new RaporlarPanel();
    window.raporlarPanel = raporlarPanel;
});
