// Gelişmiş Bildirim Sistemi
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.subscribers = [];
    this.notificationSound = null;
    this.isMuted = false;
    this.init();
  }

  // Sistem başlatma
  init() {
    this.loadNotifications();
    this.setupNotificationSound();
    this.setupBrowserNotifications();
    this.setupAutoCleanup();
  }

  // Bildirim oluşturma
  createNotification(type, title, message, options = {}) {
    const notification = {
      id: this.generateNotificationId(),
      type: type, // 'success', 'error', 'warning', 'info', 'urgent'
      title: title,
      message: message,
      timestamp: new Date().toISOString(),
      isRead: false,
      isDismissed: false,
      priority: options.priority || 'normal', // 'low', 'normal', 'high', 'urgent'
      category: options.category || 'general',
      targetUrl: options.targetUrl || null,
      userId: options.userId || null,
      expiresAt: options.expiresAt || null,
      actions: options.actions || [],
      metadata: options.metadata || {}
    };

    // Bildirimi kaydet
    this.notifications.unshift(notification);
    this.saveNotifications();

    // Abonelere bildir
    this.notifySubscribers(notification);

    // Ses çal (mute değilse)
    if (!this.isMuted && options.playSound !== false) {
      this.playNotificationSound(type);
    }

    // Tarayıcı bildirimi göster
    if (options.showBrowserNotification !== false) {
      this.showBrowserNotification(notification);
    }

    // Otomatik kapatma
    if (options.autoClose !== false) {
      this.autoCloseNotification(notification.id, options.autoCloseDelay || 5000);
    }

    return notification;
  }

  // Başarı bildirimi
  success(title, message, options = {}) {
    return this.createNotification('success', title, message, {
      priority: 'normal',
      autoClose: true,
      autoCloseDelay: 4000,
      ...options
    });
  }

  // Hata bildirimi
  error(title, message, options = {}) {
    return this.createNotification('error', title, message, {
      priority: 'high',
      autoClose: false,
      ...options
    });
  }

  // Uyarı bildirimi
  warning(title, message, options = {}) {
    return this.createNotification('warning', title, message, {
      priority: 'normal',
      autoClose: true,
      autoCloseDelay: 6000,
      ...options
    });
  }

  // Bilgi bildirimi
  info(title, message, options = {}) {
    return this.createNotification('info', title, message, {
      priority: 'low',
      autoClose: true,
      autoCloseDelay: 5000,
      ...options
    });
  }

  // Acil bildirim
  urgent(title, message, options = {}) {
    return this.createNotification('urgent', title, message, {
      priority: 'urgent',
      autoClose: false,
      playSound: true,
      showBrowserNotification: true,
      ...options
    });
  }

  // Talep durumu bildirimi
  requestStatusUpdate(requestId, oldStatus, newStatus, options = {}) {
    const title = `Talep Durumu Güncellendi`;
    const message = `Talep #${requestId} durumu "${oldStatus}" → "${newStatus}" olarak değiştirildi.`;
    
    return this.createNotification('info', title, message, {
      category: 'request_update',
      priority: 'normal',
      targetUrl: `#request-${requestId}`,
      metadata: { requestId, oldStatus, newStatus },
      ...options
    });
  }

  // Yeni talep bildirimi
  newRequestNotification(request, options = {}) {
    const title = `Yeni Talep Kaydı`;
    const message = `${request.fullname} tarafından yeni ${this.getRequestTypeText(request.requestType)} oluşturuldu.`;
    
    return this.createNotification('success', title, message, {
      category: 'new_request',
      priority: 'high',
      targetUrl: `#request-${request.id}`,
      metadata: { requestId: request.id, requestType: request.requestType },
      ...options
    });
  }

  // Sistem bildirimi
  systemNotification(title, message, options = {}) {
    return this.createNotification('info', title, message, {
      category: 'system',
      priority: 'normal',
      userId: 'system',
      ...options
    });
  }

  // Bildirim okundu olarak işaretle
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
      this.notifySubscribers(notification, 'read');
    }
  }

  // Bildirimi kapat
  dismissNotification(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isDismissed = true;
      this.saveNotifications();
      this.notifySubscribers(notification, 'dismissed');
    }
  }

  // Bildirimi sil
  deleteNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifySubscribers({ id: notificationId }, 'deleted');
  }

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();
    this.notifySubscribers(null, 'all_read');
  }

  // Tüm bildirimleri temizle
  clearAllNotifications() {
    this.notifications = [];
    this.saveNotifications();
    this.notifySubscribers(null, 'all_cleared');
  }

  // Bildirimleri filtrele
  getNotifications(filters = {}) {
    let filtered = this.notifications;

    // Tip filtreleme
    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    // Kategori filtreleme
    if (filters.category) {
      filtered = filtered.filter(n => n.category === filters.category);
    }

    // Öncelik filtreleme
    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority);
    }

    // Okunma durumu
    if (filters.isRead !== undefined) {
      filtered = filtered.filter(n => n.isRead === filters.isRead);
    }

    // Kullanıcı filtreleme
    if (filters.userId) {
      filtered = filtered.filter(n => !n.userId || n.userId === filters.userId);
    }

    // Tarih filtreleme
    if (filters.startDate) {
      filtered = filtered.filter(n => new Date(n.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      filtered = filtered.filter(n => new Date(n.timestamp) <= new Date(filters.endDate));
    }

    // Sıralama
    if (filters.sortBy === 'priority') {
      const priorityOrder = { 'urgent': 4, 'high': 3, 'normal': 2, 'low': 1 };
      filtered.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    } else {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return filtered;
  }

  // Okunmamış bildirim sayısı
  getUnreadCount(userId = null) {
    const notifications = this.getNotifications({ 
      isRead: false, 
      userId: userId 
    });
    return notifications.length;
  }

  // Bildirim istatistikleri
  getNotificationStats(userId = null) {
    const notifications = this.getNotifications({ userId: userId });
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      byCategory: {},
      byPriority: {}
    };

    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
    });

    return stats;
  }

  // Abone olma
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Abonelere bildir
  notifySubscribers(notification, action = 'created') {
    this.subscribers.forEach(callback => {
      try {
        callback(notification, action);
      } catch (error) {
        console.error('Bildirim callback hatası:', error);
      }
    });
  }

  // Bildirim sesi kurulumu
  setupNotificationSound() {
    try {
      // Web Audio API ile ses oluştur
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      this.notificationSound = {
        success: this.createTone(audioContext, 800, 600, 0.3),
        error: this.createTone(audioContext, 400, 300, 0.4),
        warning: this.createTone(audioContext, 600, 500, 0.3),
        info: this.createTone(audioContext, 1000, 800, 0.2),
        urgent: this.createTone(audioContext, 300, 200, 0.5)
      };
    } catch (error) {
      console.warn('Ses sistemi kurulamadı:', error);
    }
  }

  // Ses tonu oluşturma
  createTone(audioContext, freq1, freq2, volume) {
    return () => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq1, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(freq2, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(freq1, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.warn('Ses çalma hatası:', error);
      }
    };
  }

  // Bildirim sesi çalma
  playNotificationSound(type) {
    if (this.notificationSound && this.notificationSound[type]) {
      this.notificationSound[type]();
    }
  }

  // Ses açma/kapama
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('notificationsMuted', this.isMuted.toString());
    return this.isMuted;
  }

  // Tarayıcı bildirimi kurulumu
  setupBrowserNotifications() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  // Tarayıcı bildirimi gösterme
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        badge: this.getNotificationIcon(notification.type),
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        actions: notification.actions.map(action => ({
          action: action.id,
          title: action.title
        }))
      });

      // Bildirim tıklama
      browserNotification.onclick = () => {
        if (notification.targetUrl) {
          window.focus();
          if (notification.targetUrl.startsWith('#')) {
            // Sayfa içi link
            const element = document.querySelector(notification.targetUrl);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            // Harici link
            window.open(notification.targetUrl, '_blank');
          }
        }
        browserNotification.close();
      };

      // Bildirim kapatma
      browserNotification.onshow = () => {
        setTimeout(() => {
          browserNotification.close();
        }, 8000);
      };
    }
  }

  // Bildirim ikonu alma
  getNotificationIcon(type) {
    const icons = {
      success: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      error: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23dc2626"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      warning: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>',
      info: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      urgent: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23dc2626"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>'
    };
    return icons[type] || icons.info;
  }

  // Otomatik bildirim kapatma
  autoCloseNotification(notificationId, delay) {
    setTimeout(() => {
      this.dismissNotification(notificationId);
    }, delay);
  }

  // Otomatik temizlik
  setupAutoCleanup() {
    // Her gün eski bildirimleri temizle
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);
  }

  // Eski bildirimleri temizle
  cleanupOldNotifications() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oldNotifications = this.notifications.filter(n => 
      new Date(n.timestamp) < oneWeekAgo && n.isRead
    );
    
    if (oldNotifications.length > 0) {
      this.notifications = this.notifications.filter(n => 
        !(new Date(n.timestamp) < oneWeekAgo && n.isRead)
      );
      this.saveNotifications();
      console.log(`${oldNotifications.length} eski bildirim temizlendi`);
    }
  }

  // Bildirimleri kaydet
  saveNotifications() {
    try {
      localStorage.setItem('systemNotifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Bildirim kaydetme hatası:', error);
    }
  }

  // Bildirimleri yükle
  loadNotifications() {
    try {
      const stored = localStorage.getItem('systemNotifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Bildirim yükleme hatası:', error);
      this.notifications = [];
    }
  }

  // Bildirim ID oluşturma
  generateNotificationId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Talep türü metni
  getRequestTypeText(requestType) {
    const types = {
      'ariza': 'arıza talebi',
      'malzeme': 'malzeme talebi',
      'diger': 'talep'
    };
    return types[requestType] || 'talep';
  }

  // Bildirim şablonları
  getNotificationTemplate(type, data) {
    const templates = {
      'request_created': {
        title: 'Yeni Talep Oluşturuldu',
        message: `${data.fullname} tarafından yeni ${this.getRequestTypeText(data.requestType)} oluşturuldu.`
      },
      'request_updated': {
        title: 'Talep Güncellendi',
        message: `Talep #${data.id} güncellendi.`
      },
      'request_completed': {
        title: 'Talep Tamamlandı',
        message: `Talep #${data.id} başarıyla tamamlandı.`
      },
      'system_maintenance': {
        title: 'Sistem Bakımı',
        message: 'Sistem bakımı planlanmıştır. Lütfen çalışmalarınızı kaydedin.'
      }
    };
    
    return templates[type] || { title: 'Bildirim', message: 'Yeni bildirim' };
  }

  // Toplu bildirim gönderme
  sendBulkNotifications(users, template, options = {}) {
    const notifications = [];
    
    users.forEach(user => {
      const notification = this.createNotification(
        template.type,
        template.title,
        template.message,
        {
          userId: user.id,
          category: 'bulk',
          ...options
        }
      );
      notifications.push(notification);
    });
    
    return notifications;
  }

  // Bildirim önceliği hesaplama
  calculatePriority(notification) {
    let priority = 1; // Base priority
    
    // Tip bazlı öncelik
    const typePriority = {
      'urgent': 5,
      'error': 4,
      'warning': 3,
      'info': 2,
      'success': 1
    };
    priority += typePriority[notification.type] || 1;
    
    // Kategori bazlı öncelik
    if (notification.category === 'request_update') priority += 2;
    if (notification.category === 'system') priority += 1;
    
    // Zaman bazlı öncelik (yeni bildirimler daha öncelikli)
    const age = Date.now() - new Date(notification.timestamp).getTime();
    if (age < 60000) priority += 3; // 1 dakikadan yeni
    else if (age < 300000) priority += 2; // 5 dakikadan yeni
    else if (age < 900000) priority += 1; // 15 dakikadan yeni
    
    return priority;
  }
}

// Global notification manager instance
window.notificationManager = new NotificationManager();

// Bildirim helper fonksiyonları
function showSuccessNotification(title, message, options = {}) {
  return window.notificationManager.success(title, message, options);
}

function showErrorNotification(title, message, options = {}) {
  return window.notificationManager.error(title, message, options);
}

function showWarningNotification(title, message, options = {}) {
  return window.notificationManager.warning(title, message, options);
}

function showInfoNotification(title, message, options = {}) {
  return window.notificationManager.info(title, message, options);
}

function showUrgentNotification(title, message, options = {}) {
  return window.notificationManager.urgent(title, message, options);
}

// Bildirim sayısını güncelle
function updateNotificationBadge() {
  const unreadCount = window.notificationManager.getUnreadCount();
  const badge = document.getElementById('notificationBadge');
  
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
}
