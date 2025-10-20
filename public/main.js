// Ana sayfa JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Restoran Sipariş Sistemi yüklendi');
    
    // Socket.IO bağlantısı
    const socket = io();
    
    socket.on('connect', () => {
        console.log('Sunucuya bağlandı');
    });
    
    socket.on('disconnect', () => {
        console.log('Sunucu bağlantısı koptu');
    });
    
    // Kullanıcı giriş sistemi
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    // Giriş formu
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(loginForm);
            const username = formData.get('username');
            const password = formData.get('password');
            
            // Input validation
            if (!username || !password) {
                showNotification('Hata', 'Kullanıcı adı ve şifre gereklidir', 'error');
                return;
            }
            
            if (username.length < 3) {
                showNotification('Hata', 'Kullanıcı adı en az 3 karakter olmalıdır', 'error');
                return;
            }
            
            if (password.length < 6) {
                showNotification('Hata', 'Şifre en az 6 karakter olmalıdır', 'error');
                return;
            }
            
            // Sanitize inputs
            const sanitizedUsername = username.trim().replace(/[<>]/g, '');
            const sanitizedPassword = password.trim();
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        username: sanitizedUsername, 
                        password: sanitizedPassword 
                    })
                });
                
                if (!response.ok) {
                    if (response.status === 429) {
                        showNotification('Hata', 'Çok fazla giriş denemesi yaptınız. Lütfen 15 dakika sonra tekrar deneyin.', 'error');
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    // Store user data securely
                    const userData = {
                        id: result.user.id,
                        username: result.user.username,
                        role: result.user.role
                    };
                    
                    localStorage.setItem('user', JSON.stringify(userData));
                    showNotification('Başarılı!', result.message, 'success');
                    
                    // Dashboard'u göster
                    setTimeout(() => {
                        authSection.style.display = 'none';
                        dashboardSection.style.display = 'block';
                        updateUserInfo(result.user);
                    }, 1000);
                } else {
                    showNotification('Hata!', result.error, 'error');
                }
            } catch (error) {
                console.error('Giriş hatası:', error);
                showNotification('Hata!', 'Bağlantı hatası oluştu', 'error');
            }
        });
    }
    

    
    // Sayfa yüklendiğinde kullanıcı kontrolü
    checkUserSession();
    
    // Kart animasyonları
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Özellik animasyonları
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.5s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 100);
    });
});

// API Base URL - Test için localhost kullan
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://your-backend-url.onrender.com';

// Kullanıcı oturum kontrolü
function checkUserSession() {
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        const authSection = document.getElementById('authSection');
        const dashboardSection = document.getElementById('dashboardSection');
        
        if (authSection && dashboardSection) {
            authSection.style.display = 'none';
            dashboardSection.style.display = 'block';
            updateUserInfo(userData);
        }
    }
}

// Kullanıcı bilgilerini güncelle
function updateUserInfo(user) {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.textContent = `Hoş geldiniz, ${user.username}! (${user.role})`;
    }
    
    // Panel erişim kontrolü - tüm admin-only kartları kontrol et
    const adminCards = document.querySelectorAll('.admin-only');
    
    if (user.role === 'admin') {
        // Admin tüm panelleri görebilir
        adminCards.forEach(card => {
            card.style.display = 'block';
        });
    } else {
        // Normal kullanıcı admin panellerine erişemez
        adminCards.forEach(card => {
            card.style.display = 'none';
        });
    }
}

// Çıkış yap
function logout() {
    localStorage.removeItem('user');
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (authSection && dashboardSection) {
        authSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }
    showNotification('Bilgi', 'Başarıyla çıkış yapıldı', 'info');
}

// Panel yönlendirme
function navigateToPanel(panel) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Admin tüm panellere erişebilir
    if (user.role === 'admin') {
        window.location.href = `/${panel}`;
        return;
    }
    
    // Normal kullanıcı garson ve mutfak paneline erişebilir
    if (panel === 'garson' || panel === 'mutfak') {
        window.location.href = `/${panel}`;
        return;
    }
    
    // Normal kullanıcı admin panellerine erişemez
    if (panel === 'kasa' || panel === 'raporlar' || panel === 'stok') {
        showNotification('Uyarı', 'Bu panele erişim yetkiniz yok. Sadece admin kullanıcıları bu panellere erişebilir.', 'warning');
        return;
    }
    
    window.location.href = `/${panel}`;
}

// API çağrıları için yardımcı fonksiyon
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    return response.json();
}

// Giriş fonksiyonu
async function login(username, password) {
    try {
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (result.success) {
            localStorage.setItem('user', JSON.stringify(result.user));
            showNotification('Başarılı!', result.message, 'success');
            setTimeout(() => {
                document.getElementById('authSection').style.display = 'none';
                document.getElementById('dashboardSection').style.display = 'block';
                updateUserInfo(result.user);
            }, 1000);
        } else {
            showNotification('Hata!', result.error, 'error');
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        showNotification('Hata!', 'Bağlantı hatası oluştu', 'error');
    }
}

// Bildirim gösterme
function showNotification(title, message, type = 'info') {
    const modal = document.getElementById('notificationModal');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    
    if (modal && titleEl && messageEl) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Tip'e göre renk ayarla
        const content = modal.querySelector('.notification-content');
        if (content) {
            content.className = 'notification-content';
            content.classList.add(`notification-${type}`);
        }
        
        modal.style.display = 'block';
    }
}

// Bildirim kapatma
function closeNotification() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
