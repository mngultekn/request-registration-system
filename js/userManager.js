// Kullanıcı Yönetimi ve Rol Tabanlı Erişim Sistemi
class UserManager {
  constructor() {
    this.users = this.loadUsers();
    this.roles = this.defineRoles();
    this.currentUser = null;
    this.init();
  }

  // Sistem başlatma
  init() {
    this.setupUserSession();
    this.setupRoleBasedAccess();
    this.setupUserActivityTracking();
  }

  // Kullanıcıları yükle
  loadUsers() {
    try {
      const storedUsers = localStorage.getItem('systemUsers');
      if (storedUsers) {
        return JSON.parse(storedUsers);
      }
      
      // Varsayılan kullanıcılar (demo sistem için)
      const defaultUsers = [
        {
          id: 'admin_001',
          username: 'admin',
          password: this.hashPassword('admin123'),
          fullName: 'Sistem Yöneticisi',
          email: 'admin@ibb.gov.tr',
          role: 'admin',
          department: 'Bilgi İşlem',
          phone: '0212 000 00 00',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          permissions: ['all']
        },
        {
          id: 'tech_001',
          username: 'tech',
          password: this.hashPassword('tech123'),
          fullName: 'Teknik Uzman',
          email: 'tech@ibb.gov.tr',
          role: 'technician',
          department: 'Teknik Destek',
          phone: '0212 000 00 01',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          permissions: ['read', 'write', 'update_status', 'view_reports']
        },
        {
          id: 'user_001',
          username: 'user1',
          password: this.hashPassword('user123'),
          fullName: 'Kullanıcı Bir',
          email: 'user1@ibb.gov.tr',
          role: 'user',
          department: 'Genel Müdürlük',
          phone: '0212 000 00 02',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          permissions: ['read', 'write_own', 'view_own_reports']
        }
      ];
      
      localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
      return defaultUsers;
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
      return [];
    }
  }

  // Rolleri tanımla
  defineRoles() {
    return {
      admin: {
        name: 'Sistem Yöneticisi',
        description: 'Tam sistem erişimi',
        permissions: [
          'read', 'write', 'delete', 'manage_users', 'export_data',
          'view_reports', 'system_settings', 'backup_restore'
        ],
        color: '#dc2626',
        icon: '👑'
      },
      technician: {
        name: 'Teknik Uzman',
        description: 'Teknik işlemler ve raporlama',
        permissions: [
          'read', 'write', 'update_status', 'view_reports',
          'export_data', 'manage_own_tickets'
        ],
        color: '#2563eb',
        icon: '🔧'
      },
      user: {
        name: 'Kullanıcı',
        description: 'Temel kullanıcı işlemleri',
        permissions: [
          'read', 'write_own', 'view_own_reports', 'update_own_status'
        ],
        color: '#059669',
        icon: '👤'
      }
    };
  }

  // Kullanıcı girişi
  async login(username, password) {
    try {
      const user = this.users.find(u => 
        u.username === username && 
        u.isActive === true
      );

      if (!user) {
        return { success: false, error: 'Kullanıcı bulunamadı veya aktif değil' };
      }

      // Şifre kontrolü
      if (!await this.verifyPassword(password, user.password)) {
        this.logFailedLogin(username);
        return { success: false, error: 'Geçersiz şifre' };
      }

      // Giriş başarılı
      this.currentUser = user;
      this.updateLastLogin(user.id);
      this.logSuccessfulLogin(user);
      
      // Kullanıcı oturumunu başlat
      this.startUserSession(user);
      
      return { 
        success: true, 
        user: this.sanitizeUserData(user),
        role: this.roles[user.role]
      };
    } catch (error) {
      console.error('Giriş hatası:', error);
      return { success: false, error: 'Giriş işlemi başarısız' };
    }
  }

  // Kullanıcı çıkışı
  logout() {
    if (this.currentUser) {
      this.logUserLogout(this.currentUser);
      this.endUserSession();
      this.currentUser = null;
    }
    
    // LocalStorage temizleme
    localStorage.removeItem('currentUserSession');
    localStorage.removeItem('userPermissions');
    
    // Ana sayfaya yönlendir
    window.location.href = 'index.html';
  }

  // Kullanıcı oturumu başlat
  startUserSession(user) {
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    localStorage.setItem('currentUserSession', JSON.stringify(session));
    localStorage.setItem('userPermissions', JSON.stringify(user.permissions));
    
    // Oturum süresini kontrol et
    this.setupSessionTimeout();
  }

  // Kullanıcı oturumu sonlandır
  endUserSession() {
    if (this.currentUser) {
      const session = JSON.parse(localStorage.getItem('currentUserSession') || '{}');
      session.endTime = new Date().toISOString();
      
      // Oturum logunu kaydet
      this.logSessionEnd(session);
    }
  }

  // Oturum süresi kontrolü
  setupSessionTimeout() {
    const sessionTimeout = 8 * 60 * 60 * 1000; // 8 saat
    
    setTimeout(() => {
      if (this.currentUser) {
        alert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        this.logout();
      }
    }, sessionTimeout);
  }

  // Kullanıcı oturumunu kontrol et
  checkUserSession() {
    try {
      const session = localStorage.getItem('currentUserSession');
      if (!session) return false;
      
      const sessionData = JSON.parse(session);
      const user = this.users.find(u => u.id === sessionData.userId);
      
      if (!user || !user.isActive) {
        this.logout();
        return false;
      }
      
      // Son aktivite zamanını güncelle
      sessionData.lastActivity = new Date().toISOString();
      localStorage.setItem('currentUserSession', JSON.stringify(sessionData));
      
      this.currentUser = user;
      return true;
    } catch (error) {
      console.error('Oturum kontrolü hatası:', error);
      return false;
    }
  }

  // Yetki kontrolü
  hasPermission(permission) {
    if (!this.currentUser) return false;
    
    const userPermissions = this.currentUser.permissions;
    return userPermissions.includes('all') || userPermissions.includes(permission);
  }

  // Rol tabanlı erişim kontrolü
  canAccess(feature) {
    if (!this.currentUser) return false;
    
    const rolePermissions = {
      admin: ['all'],
      technician: ['tickets', 'reports', 'status_updates', 'own_management'],
      user: ['own_tickets', 'basic_reports', 'status_view']
    };
    
    const allowedFeatures = rolePermissions[this.currentUser.role] || [];
    return allowedFeatures.includes('all') || allowedFeatures.includes(feature);
  }

  // Kullanıcı ekleme (sadece admin)
  addUser(userData) {
    if (!this.hasPermission('manage_users')) {
      return { success: false, error: 'Bu işlem için yetkiniz yok' };
    }
    
    try {
      // Kullanıcı verilerini validate et
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      
      // Yeni kullanıcı oluştur
      const newUser = {
        id: this.generateUserId(),
        ...userData,
        password: this.hashPassword(userData.password),
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };
      
      this.users.push(newUser);
      this.saveUsers();
      
      return { success: true, user: this.sanitizeUserData(newUser) };
    } catch (error) {
      console.error('Kullanıcı ekleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kullanıcı güncelleme
  updateUser(userId, updates) {
    if (!this.hasPermission('manage_users')) {
      return { success: false, error: 'Bu işlem için yetkiniz yok' };
    }
    
    try {
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }
      
      // Şifre güncelleniyorsa hash'le
      if (updates.password) {
        updates.password = this.hashPassword(updates.password);
      }
      
      // Güncelleme bilgilerini ekle
      updates.lastModified = new Date().toISOString();
      updates.modifiedBy = this.currentUser.id;
      
      this.users[userIndex] = { ...this.users[userIndex], ...updates };
      this.saveUsers();
      
      return { success: true, user: this.sanitizeUserData(this.users[userIndex]) };
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kullanıcı silme (soft delete)
  deleteUser(userId) {
    if (!this.hasPermission('manage_users')) {
      return { success: false, error: 'Bu işlem için yetkiniz yok' };
    }
    
    try {
      const user = this.users.find(u => u.id === userId);
      if (!user) {
        return { success: false, error: 'Kullanıcı bulunamadı' };
      }
      
      // Kendini silmeye çalışıyorsa engelle
      if (userId === this.currentUser.id) {
        return { success: false, error: 'Kendinizi silemezsiniz' };
      }
      
      // Soft delete - sadece aktif durumu değiştir
      user.isActive = false;
      user.deletedAt = new Date().toISOString();
      user.deletedBy = this.currentUser.id;
      
      this.saveUsers();
      
      return { success: true, message: 'Kullanıcı başarıyla silindi' };
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kullanıcı verilerini validate et
  validateUserData(userData) {
    const errors = [];
    
    if (!userData.username || userData.username.length < 3) {
      errors.push('Kullanıcı adı en az 3 karakter olmalıdır');
    }
    
    if (!userData.password || userData.password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır');
    }
    
    if (!userData.fullName || userData.fullName.length < 2) {
      errors.push('Ad soyad en az 2 karakter olmalıdır');
    }
    
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Geçerli bir email adresi girin');
    }
    
    if (!userData.role || !this.roles[userData.role]) {
      errors.push('Geçerli bir rol seçin');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Email formatı kontrolü
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Kullanıcı verilerini temizle (şifre gizle)
  sanitizeUserData(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  // Kullanıcıları kaydet
  saveUsers() {
    try {
      localStorage.setItem('systemUsers', JSON.stringify(this.users));
      return true;
    } catch (error) {
      console.error('Kullanıcı kaydetme hatası:', error);
      return false;
    }
  }

  // Kullanıcı ID oluştur
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Şifre hash'leme
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Şifre doğrulama
  async verifyPassword(password, hashedPassword) {
    const hashed = await this.hashPassword(password);
    return hashed === hashedPassword;
  }

  // Son giriş zamanını güncelle
  updateLastLogin(userId) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.saveUsers();
    }
  }

  // Başarısız giriş logu
  logFailedLogin(username) {
    const log = {
      type: 'failed_login',
      username: username,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(),
      userAgent: navigator.userAgent
    };
    
    this.addActivityLog(log);
  }

  // Başarılı giriş logu
  logSuccessfulLogin(user) {
    const log = {
      type: 'successful_login',
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(),
      userAgent: navigator.userAgent
    };
    
    this.addActivityLog(log);
  }

  // Çıkış logu
  logUserLogout(user) {
    const log = {
      type: 'logout',
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP()
    };
    
    this.addActivityLog(log);
  }

  // Oturum sonu logu
  logSessionEnd(session) {
    const log = {
      type: 'session_end',
      userId: session.userId,
      username: session.username,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: new Date(session.endTime) - new Date(session.startTime)
    };
    
    this.addActivityLog(log);
  }

  // Aktivite logu ekle
  addActivityLog(log) {
    try {
      const logs = JSON.parse(localStorage.getItem('userActivityLogs') || '[]');
      logs.unshift(log);
      
      // Son 1000 logu tut
      if (logs.length > 1000) {
        logs.splice(1000);
      }
      
      localStorage.setItem('userActivityLogs', JSON.stringify(logs));
    } catch (error) {
      console.error('Log ekleme hatası:', error);
    }
  }

  // Client IP adresi alma (demo için)
  getClientIP() {
    // Gerçek uygulamada backend'den alınır
    return '127.0.0.1';
  }

  // Rol tabanlı erişim kurulumu
  setupRoleBasedAccess() {
    // Sayfa yüklendiğinde erişim kontrolü
    document.addEventListener('DOMContentLoaded', () => {
      this.checkPageAccess();
    });
  }

  // Sayfa erişim kontrolü
  checkPageAccess() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'yonetici.html' && !this.canAccess('admin_panel')) {
      alert('Bu sayfaya erişim yetkiniz yok!');
      window.location.href = 'index.html';
    }
    
    if (currentPage === 'kullanici.html' && !this.canAccess('user_panel')) {
      alert('Bu sayfaya erişim yetkiniz yok!');
      window.location.href = 'index.html';
    }
  }

  // Kullanıcı aktivite takibi
  setupUserActivityTracking() {
    // Kullanıcı aktivitelerini takip et
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.updateUserActivity();
      });
    });
    
    // Sayfa görünürlük değişikliği
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logUserInactivity();
      } else {
        this.updateUserActivity();
      }
    });
  }

  // Kullanıcı aktivitesini güncelle
  updateUserActivity() {
    if (this.currentUser) {
      const session = JSON.parse(localStorage.getItem('currentUserSession') || '{}');
      session.lastActivity = new Date().toISOString();
      localStorage.setItem('currentUserSession', JSON.stringify(session));
    }
  }

  // Kullanıcı inaktivite logu
  logUserInactivity() {
    if (this.currentUser) {
      const log = {
        type: 'user_inactivity',
        userId: this.currentUser.id,
        username: this.currentUser.username,
        timestamp: new Date().toISOString()
      };
      
      this.addActivityLog(log);
    }
  }

  // Kullanıcı istatistikleri
  getUserStats() {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => u.isActive).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    const roleStats = {};
    this.users.forEach(user => {
      if (user.isActive) {
        roleStats[user.role] = (roleStats[user.role] || 0) + 1;
      }
    });
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats,
      lastActivity: this.getLastActivityTime()
    };
  }

  // Son aktivite zamanı
  getLastActivityTime() {
    try {
      const logs = JSON.parse(localStorage.getItem('userActivityLogs') || '[]');
      return logs.length > 0 ? logs[0].timestamp : null;
    } catch (error) {
      return null;
    }
  }

  // Kullanıcı arama
  searchUsers(query) {
    if (!this.hasPermission('manage_users')) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    return this.users.filter(user => 
      user.username.toLowerCase().includes(searchTerm) ||
      user.fullName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.department.toLowerCase().includes(searchTerm)
    ).map(user => this.sanitizeUserData(user));
  }

  // Kullanıcı filtreleme
  filterUsers(filters) {
    if (!this.hasPermission('manage_users')) {
      return [];
    }
    
    let filteredUsers = this.users;
    
    if (filters.role) {
      filteredUsers = filteredUsers.filter(u => u.role === filters.role);
    }
    
    if (filters.department) {
      filteredUsers = filteredUsers.filter(u => u.department === filters.department);
    }
    
    if (filters.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.isActive === filters.isActive);
    }
    
    return filteredUsers.map(user => this.sanitizeUserData(user));
  }
}

// Global user manager instance
window.userManager = new UserManager();

// Kullanıcı oturum kontrolü
function checkUserSession() {
  return window.userManager.checkUserSession();
}

// Yetki kontrolü
function hasPermission(permission) {
  return window.userManager.hasPermission(permission);
}

// Erişim kontrolü
function canAccess(feature) {
  return window.userManager.canAccess(feature);
}
