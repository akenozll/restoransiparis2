// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

// Stok Yönetimi JavaScript
class StokPanel {
    constructor() {
        this.socket = io(API_BASE_URL);
        this.products = [];
        this.orders = [];
        this.selectedProduct = null;
        
        this.init();
    }
    
    init() {
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadInitialData();
        this.loadUserInfo();
        this.renderStockTable();
        this.updateSummaryCards();
        this.updateAlerts();
    }
    
    setupSocketListeners() {
        this.socket.on('menuData', (menu) => {
            this.products = [...menu.yemekler, ...menu.icecekler];
            this.renderStockTable();
            this.updateSummaryCards();
            this.updateAlerts();
        });
        
        this.socket.on('orderData', (orders) => {
            this.orders = orders;
            this.updateStockFromOrders();
        });
        
        this.socket.on('newOrder', (order) => {
            this.orders.push(order);
            this.updateStockFromOrders();
        });
    }
    
    setupEventListeners() {
        // Arama input'u
        document.getElementById('searchProduct').addEventListener('input', (e) => {
            this.applyFilters();
        });
        
        // Stok değişikliği hesaplama
        document.getElementById('stockChange').addEventListener('input', (e) => {
            this.calculateNewStock();
        });
    }
    
    loadInitialData() {
        fetch(`${API_BASE_URL}/api/menu`)
            .then(response => response.json())
            .then(menu => {
                this.products = [...menu.yemekler, ...menu.icecekler];
                this.renderStockTable();
                this.updateSummaryCards();
                this.updateAlerts();
            });
        
        fetch(`${API_BASE_URL}/api/orders`)
            .then(response => response.json())
            .then(orders => {
                this.orders = orders;
                this.updateStockFromOrders();
            });
    }
    
    loadUserInfo() {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = `${userData.username} (${userData.role})`;
            }
        }
    }
    
    updateStockFromOrders() {
        // Siparişlerden stok çıkarma simülasyonu
        this.orders.forEach(order => {
            order.items.forEach(item => {
                const product = this.products.find(p => p.id === item.id);
                if (product) {
                    if (!product.stock) product.stock = 100; // Varsayılan stok
                    if (!product.minStock) product.minStock = 10; // Varsayılan minimum stok
                    product.stock = Math.max(0, product.stock - item.quantity);
                }
            });
        });
        this.renderStockTable();
        this.updateSummaryCards();
        this.updateAlerts();
    }
    
    renderStockTable() {
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            const stock = product.stock || 100;
            const minStock = product.minStock || 10;
            const totalValue = stock * product.price;
            const status = this.getStockStatus(stock, minStock);
            
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td class="stock-amount ${status}">${stock}</td>
                <td>${minStock}</td>
                <td>${product.price.toFixed(2)} TL</td>
                <td>${totalValue.toFixed(2)} TL</td>
                <td><span class="status-badge ${status}">${this.getStatusText(status)}</span></td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="showUpdateStockModal(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="viewProductHistory(${product.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    getStockStatus(stock, minStock) {
        if (stock === 0) return 'out';
        if (stock <= minStock) return 'low';
        return 'normal';
    }
    
    getStatusText(status) {
        switch (status) {
            case 'out': return 'Tükendi';
            case 'low': return 'Düşük';
            case 'normal': return 'Normal';
            default: return 'Bilinmiyor';
        }
    }
    
    updateSummaryCards() {
        const totalProducts = this.products.length;
        const lowStock = this.products.filter(p => {
            const stock = p.stock || 100;
            const minStock = p.minStock || 10;
            return stock > 0 && stock <= minStock;
        }).length;
        const outOfStock = this.products.filter(p => (p.stock || 100) === 0).length;
        const totalValue = this.products.reduce((sum, p) => {
            return sum + ((p.stock || 100) * p.price);
        }, 0);
        
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('lowStock').textContent = lowStock;
        document.getElementById('outOfStock').textContent = outOfStock;
        document.getElementById('totalValue').textContent = totalValue.toFixed(2) + ' TL';
    }
    
    updateAlerts() {
        const container = document.getElementById('stockAlerts');
        container.innerHTML = '';
        
        const alerts = [];
        
        // Tükenen ürünler
        this.products.filter(p => (p.stock || 100) === 0).forEach(product => {
            alerts.push({
                type: 'error',
                message: `${product.name} ürününün stoku tükendi!`,
                product: product
            });
        });
        
        // Düşük stok uyarıları
        this.products.filter(p => {
            const stock = p.stock || 100;
            const minStock = p.minStock || 10;
            return stock > 0 && stock <= minStock;
        }).forEach(product => {
            alerts.push({
                type: 'warning',
                message: `${product.name} ürününün stoku düşük (${product.stock || 100}/${product.minStock || 10})`,
                product: product
            });
        });
        
        if (alerts.length === 0) {
            container.innerHTML = '<div class="alert alert-success">Tüm ürünlerin stok durumu normal.</div>';
        } else {
            alerts.forEach(alert => {
                const alertElement = document.createElement('div');
                alertElement.className = `alert alert-${alert.type}`;
                alertElement.innerHTML = `
                    <i class="fas fa-${alert.type === 'error' ? 'times-circle' : 'exclamation-triangle'}"></i>
                    <span>${alert.message}</span>
                    <button class="btn btn-small btn-primary" onclick="showUpdateStockModal(${alert.product.id})">
                        Stok Ekle
                    </button>
                `;
                container.appendChild(alertElement);
            });
        }
    }
    
    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter').value;
        const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
        
        const filteredProducts = this.products.filter(product => {
            // Kategori filtresi
            if (categoryFilter && product.category !== categoryFilter) return false;
            
            // Arama filtresi
            if (searchTerm && !product.name.toLowerCase().includes(searchTerm)) return false;
            
            // Stok durumu filtresi
            if (stockFilter) {
                const stock = product.stock || 100;
                const minStock = product.minStock || 10;
                const status = this.getStockStatus(stock, minStock);
                if (status !== stockFilter) return false;
            }
            
            return true;
        });
        
        this.renderFilteredTable(filteredProducts);
    }
    
    renderFilteredTable(filteredProducts) {
        const tbody = document.getElementById('stockTableBody');
        tbody.innerHTML = '';
        
        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            const stock = product.stock || 100;
            const minStock = product.minStock || 10;
            const totalValue = stock * product.price;
            const status = this.getStockStatus(stock, minStock);
            
            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td class="stock-amount ${status}">${stock}</td>
                <td>${minStock}</td>
                <td>${product.price.toFixed(2)} TL</td>
                <td>${totalValue.toFixed(2)} TL</td>
                <td><span class="status-badge ${status}">${this.getStatusText(status)}</span></td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="showUpdateStockModal(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-secondary" onclick="viewProductHistory(${product.id})">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    calculateNewStock() {
        const currentStock = parseInt(document.getElementById('currentStock').value) || 0;
        const stockChange = parseInt(document.getElementById('stockChange').value) || 0;
        const newStock = Math.max(0, currentStock + stockChange);
        document.getElementById('newStock').value = newStock;
    }
}

// Global fonksiyonlar
function showAddProductModal() {
    document.getElementById('addProductModal').style.display = 'block';
}

function showUpdateStockModal(productId) {
    const product = window.stokPanel.products.find(p => p.id === productId);
    if (product) {
        window.stokPanel.selectedProduct = product;
        document.getElementById('updateProductName').value = product.name;
        document.getElementById('currentStock').value = product.stock || 100;
        document.getElementById('stockChange').value = '';
        document.getElementById('newStock').value = product.stock || 100;
        document.getElementById('updateStockModal').style.display = 'block';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addProduct() {
    const form = document.getElementById('addProductForm');
    const formData = new FormData(form);
    
    const newProduct = {
        id: Date.now(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        minStock: parseInt(document.getElementById('productMinStock').value),
        description: document.getElementById('productDescription').value
    };
    
    // Yeni ürünü menüye ekle
    if (newProduct.category === 'yemek') {
        window.stokPanel.products.push(newProduct);
    } else {
        window.stokPanel.products.push(newProduct);
    }
    
    // Tabloyu güncelle
    window.stokPanel.renderStockTable();
    window.stokPanel.updateSummaryCards();
    window.stokPanel.updateAlerts();
    
    // Modal'ı kapat
    closeModal('addProductModal');
    form.reset();
    
    showNotification('Başarılı', 'Yeni ürün eklendi!', 'success');
}

function updateStock() {
    const product = window.stokPanel.selectedProduct;
    const stockChange = parseInt(document.getElementById('stockChange').value) || 0;
    const note = document.getElementById('stockNote').value;
    
    if (product) {
        product.stock = Math.max(0, (product.stock || 100) + stockChange);
        
        // Stok geçmişi kaydet (gerçek uygulamada veritabanına kaydedilir)
        if (!product.stockHistory) product.stockHistory = [];
        product.stockHistory.push({
            date: new Date(),
            change: stockChange,
            newStock: product.stock,
            note: note,
            user: JSON.parse(localStorage.getItem('user'))?.username || 'Bilinmeyen'
        });
        
        // Tabloyu güncelle
        window.stokPanel.renderStockTable();
        window.stokPanel.updateSummaryCards();
        window.stokPanel.updateAlerts();
        
        // Modal'ı kapat
        closeModal('updateStockModal');
        
        showNotification('Başarılı', 'Stok güncellendi!', 'success');
    }
}

function applyFilters() {
    if (window.stokPanel) {
        window.stokPanel.applyFilters();
    }
}

function viewProductHistory(productId) {
    const product = window.stokPanel.products.find(p => p.id === productId);
    if (product && product.stockHistory) {
        let historyText = `${product.name} - Stok Geçmişi:\n\n`;
        product.stockHistory.forEach(entry => {
            historyText += `${entry.date.toLocaleString('tr-TR')} - ${entry.change > 0 ? '+' : ''}${entry.change} (${entry.newStock}) - ${entry.note || 'Not yok'} - ${entry.user}\n`;
        });
        alert(historyText);
    } else {
        alert('Bu ürün için stok geçmişi bulunamadı.');
    }
}

function exportStockReport() {
    const report = {
        date: new Date().toLocaleString('tr-TR'),
        products: window.stokPanel.products.map(p => ({
            name: p.name,
            category: p.category,
            stock: p.stock || 100,
            minStock: p.minStock || 10,
            price: p.price,
            totalValue: (p.stock || 100) * p.price,
            status: window.stokPanel.getStockStatus(p.stock || 100, p.minStock || 10)
        }))
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stok-raporu-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('Başarılı', 'Stok raporu indirildi!', 'success');
}

function showNotification(title, message, type) {
    // Basit bildirim sistemi
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#ed8936'};
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Panel başlatma
let stokPanel;
document.addEventListener('DOMContentLoaded', function() {
    stokPanel = new StokPanel();
    window.stokPanel = stokPanel;
});


