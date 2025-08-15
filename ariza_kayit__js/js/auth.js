// Güvenli Authentication Sistemi
class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.tokenKey = 'authToken';
    this.userKey = 'currentUser';
    this.checkAuthStatus();
  }

  // Kullanıcı girişi
  async login(username, password) {
    try {
      // Güvenli hash kontrolü (gerçek uygulamada backend'de yapılır)
      const hashedPassword = await this.hashPassword(password);
      
      // Demo kullanıcılar (gerçek uygulamada backend'den gelir)
      const validUsers = [
        { username: 'admin', password: await this.hashPassword('admin123'), role: 'admin' },
        { username: 'user1', password: await this.hashPassword('user123'), role: 'user' },
        { username: 'tech', password: await this.hashPassword('tech123'), role: 'technician' }
      ];

      const user = validUsers.find(u => 
        u.username === username && 
        await this.verifyPassword(password, u.password)
      );

      if (user) {
        const token = this.generateToken(user);
        this.setAuthToken(token);
        this.setCurrentUser({ ...user, password: undefined });
        this.isAuthenticated = true;
        return { success: true, user: this.currentUser };
      } else {
        throw new Error('Geçersiz kullanıcı adı veya şifre');
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Kullanıcı çıkışı
  logout() {
    this.removeAuthToken();
    this.removeCurrentUser();
    this.isAuthenticated = false;
    this.currentUser = null;
    window.location.href = 'index.html';
  }

  // Token kontrolü
  checkAuthStatus() {
    const token = this.getAuthToken();
    const user = this.getCurrentUser();
    
    if (token && user) {
      // Token geçerliliğini kontrol et (gerçek uygulamada JWT validation)
      if (this.isTokenValid(token)) {
        this.isAuthenticated = true;
        this.currentUser = user;
        return true;
      } else {
        this.logout();
        return false;
      }
    }
    return false;
  }

  // Yetki kontrolü
  hasPermission(permission) {
    if (!this.isAuthenticated || !this.currentUser) return false;
    
    const permissions = {
      'admin': ['read', 'write', 'delete', 'manage_users', 'export_data'],
      'technician': ['read', 'write', 'update_status'],
      'user': ['read', 'write_own']
    };

    return permissions[this.currentUser.role]?.includes(permission) || false;
  }

  // Güvenli token oluşturma
  generateToken(user) {
    const payload = {
      username: user.username,
      role: user.role,
      timestamp: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 saat
    };
    
    // Gerçek uygulamada JWT kullanılır
    return btoa(JSON.stringify(payload));
  }

  // Token geçerlilik kontrolü
  isTokenValid(token) {
    try {
      const payload = JSON.parse(atob(token));
      return payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  // Şifre hash'leme (gerçek uygulamada bcrypt kullanılır)
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

  // LocalStorage işlemleri
  setAuthToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  getAuthToken() {
    return localStorage.getItem(this.tokenKey);
  }

  removeAuthToken() {
    localStorage.removeItem(this.tokenKey);
  }

  setCurrentUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getCurrentUser() {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  removeCurrentUser() {
    localStorage.removeItem(this.userKey);
  }
}

// Global auth instance
window.authManager = new AuthManager();

// Güvenlik middleware
function requireAuth(requiredRole = null) {
  if (!window.authManager.isAuthenticated) {
    window.location.href = 'login.html';
    return false;
  }
  
  if (requiredRole && window.authManager.currentUser.role !== requiredRole) {
    alert('Bu sayfaya erişim yetkiniz yok!');
    window.history.back();
    return false;
  }
  
  return true;
}

// CSRF token oluşturma
function generateCSRFToken() {
  const token = Math.random().toString(36).substr(2, 15);
  sessionStorage.setItem('csrfToken', token);
  return token;
}

// CSRF token kontrolü
function validateCSRFToken(token) {
  const storedToken = sessionStorage.getItem('csrfToken');
  return token === storedToken;
}
