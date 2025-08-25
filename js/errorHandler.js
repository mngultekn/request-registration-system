// Kapsamlı Hata Yönetimi ve Loglama Sistemi
class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000;
    this.errorLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    this.currentLevel = this.errorLevels.INFO;
    this.init();
  }

  // Sistem başlatma
  init() {
    this.setupGlobalErrorHandling();
    this.setupUnhandledRejectionHandling();
    this.setupPerformanceMonitoring();
    this.setupConsoleInterception();
    this.loadErrorHistory();
  }

  // Global hata yakalama
  setupGlobalErrorHandling() {
    // JavaScript hataları
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
        level: this.errorLevels.ERROR
      });
    });

    // Promise rejection'ları
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Promise rejection',
        reason: event.reason,
        stack: event.reason?.stack,
        level: this.errorLevels.ERROR
      });
    });

    // Resource loading hataları
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          type: 'resource_error',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          resource: event.target.src || event.target.href,
          tagName: event.target.tagName,
          level: this.errorLevels.WARN
        });
      }
    }, true);
  }

  // Unhandled rejection handling
  setupUnhandledRejectionHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      
      this.handleError({
        type: 'unhandled_promise_rejection',
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        stack: event.reason?.stack,
        level: this.errorLevels.ERROR
      });
    });
  }

  // Performance monitoring
  setupPerformanceMonitoring() {
    // Sayfa yükleme performansı
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measurePagePerformance();
      }, 0);
    });

    // Long task detection
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // 50ms'den uzun görevler
              this.handleError({
                type: 'performance_warning',
                message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
                duration: entry.duration,
                startTime: entry.startTime,
                level: this.errorLevels.WARN
              });
            }
          });
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported');
      }
    }
  }

  // Console interception
  setupConsoleInterception() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    // Console.error'ları yakala
    console.error = (...args) => {
      this.handleError({
        type: 'console_error',
        message: args.map(arg => String(arg)).join(' '),
        args: args,
        stack: new Error().stack,
        level: this.errorLevels.ERROR
      });
      originalConsole.error.apply(console, args);
    };

    // Console.warn'ları yakala
    console.warn = (...args) => {
      this.handleError({
        type: 'console_warning',
        message: args.map(arg => String(arg)).join(' '),
        args: args,
        stack: new Error().stack,
        level: this.errorLevels.WARN
      });
      originalConsole.warn.apply(console, args);
    };
  }

  // Hata işleme
  handleError(errorData) {
    // Hata seviyesi kontrolü
    if (errorData.level < this.currentLevel) {
      return;
    }

    // Hata verilerini zenginleştir
    const enrichedError = {
      ...errorData,
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: this.getMemoryInfo(),
      session: this.getSessionInfo()
    };

    // Hatayı kaydet
    this.errors.unshift(enrichedError);
    
    // Maksimum hata sayısını kontrol et
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Hatayı logla
    this.logError(enrichedError);
    
    // Hatayı kaydet
    this.saveErrors();
    
    // Kritik hataları bildir
    if (enrichedError.level >= this.errorLevels.CRITICAL) {
      this.notifyCriticalError(enrichedError);
    }

    // Hata sayacını güncelle
    this.updateErrorCounter();
  }

  // Hata loglama
  logError(error) {
    const levelName = Object.keys(this.errorLevels).find(key => 
      this.errorLevels[key] === error.level
    );

    const logMessage = `[${levelName}] ${error.type}: ${error.message}`;
    
    switch (error.level) {
      case this.errorLevels.DEBUG:
        console.debug(logMessage, error);
        break;
      case this.errorLevels.INFO:
        console.info(logMessage, error);
        break;
      case this.errorLevels.WARN:
        console.warn(logMessage, error);
        break;
      case this.errorLevels.ERROR:
        console.error(logMessage, error);
        break;
      case this.errorLevels.CRITICAL:
        console.error(`🚨 CRITICAL: ${logMessage}`, error);
        break;
    }
  }

  // Kritik hata bildirimi
  notifyCriticalError(error) {
    // Bildirim sistemi varsa kullan
    if (window.notificationManager) {
      window.notificationManager.urgent(
        'Kritik Sistem Hatası',
        `${error.type}: ${error.message}`,
        {
          category: 'system_error',
          metadata: { errorId: error.id }
        }
      );
    }

    // Admin'e email gönder (gerçek uygulamada)
    this.sendErrorAlert(error);
  }

  // Hata uyarısı gönder
  sendErrorAlert(error) {
    // Demo için localStorage'a kaydet
    const alerts = JSON.parse(localStorage.getItem('errorAlerts') || '[]');
    alerts.unshift({
      errorId: error.id,
      timestamp: error.timestamp,
      type: error.type,
      message: error.message,
      level: error.level
    });
    
    // Son 100 uyarıyı tut
    if (alerts.length > 100) {
      alerts.splice(100);
    }
    
    localStorage.setItem('errorAlerts', JSON.stringify(alerts));
  }

  // Sayfa performansı ölçümü
  measurePagePerformance() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      const metrics = {
        type: 'performance_metrics',
        dnsLookup: navigation?.domainLookupEnd - navigation?.domainLookupStart,
        tcpConnection: navigation?.connectEnd - navigation?.connectStart,
        serverResponse: navigation?.responseEnd - navigation?.responseStart,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime
      };

      // Performans sorunlarını kontrol et
      if (metrics.domContentLoaded > 3000) {
        this.handleError({
          type: 'performance_warning',
          message: `Slow DOM content loaded: ${metrics.domContentLoaded.toFixed(2)}ms`,
          metrics: metrics,
          level: this.errorLevels.WARN
        });
      }

      if (metrics.loadComplete > 5000) {
        this.handleError({
          type: 'performance_warning',
          message: `Slow page load: ${metrics.loadComplete.toFixed(2)}ms`,
          metrics: metrics,
          level: this.errorLevels.WARN
        });
      }
    }
  }

  // Memory bilgisi alma
  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  // Session bilgisi alma
  getSessionInfo() {
    try {
      const session = JSON.parse(localStorage.getItem('currentUserSession') || '{}');
      return {
        userId: session.userId,
        username: session.username,
        role: session.role
      };
    } catch (error) {
      return null;
    }
  }

  // Hata ID oluşturma
  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Hataları kaydet
  saveErrors() {
    try {
      localStorage.setItem('systemErrors', JSON.stringify(this.errors));
    } catch (error) {
      console.error('Hata kaydetme hatası:', error);
    }
  }

  // Hata geçmişini yükle
  loadErrorHistory() {
    try {
      const stored = localStorage.getItem('systemErrors');
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Hata geçmişi yükleme hatası:', error);
      this.errors = [];
    }
  }

  // Hata sayacını güncelle
  updateErrorCounter() {
    const errorCount = this.errors.length;
    const criticalCount = this.errors.filter(e => e.level >= this.errorLevels.CRITICAL).length;
    
    // Hata sayacını UI'da göster
    this.updateErrorBadge(errorCount, criticalCount);
  }

  // Hata badge'ini güncelle
  updateErrorBadge(totalCount, criticalCount) {
    const badge = document.getElementById('errorBadge');
    if (badge) {
      if (criticalCount > 0) {
        badge.textContent = criticalCount;
        badge.className = 'error-badge critical';
        badge.style.display = 'block';
      } else if (totalCount > 0) {
        badge.textContent = totalCount;
        badge.className = 'error-badge warning';
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // Hataları filtrele
  getErrors(filters = {}) {
    let filtered = this.errors;

    // Tip filtreleme
    if (filters.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }

    // Seviye filtreleme
    if (filters.level !== undefined) {
      filtered = filtered.filter(e => e.level >= filters.level);
    }

    // Tarih filtreleme
    if (filters.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(filters.endDate));
    }

    // URL filtreleme
    if (filters.url) {
      filtered = filtered.filter(e => e.url.includes(filters.url));
    }

    // Sıralama
    if (filters.sortBy === 'level') {
      filtered.sort((a, b) => b.level - a.level);
    } else {
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    return filtered;
  }

  // Hata istatistikleri
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byLevel: {},
      byType: {},
      byUrl: {},
      criticalCount: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0
    };

    this.errors.forEach(error => {
      // Seviye bazlı sayım
      const levelName = Object.keys(this.errorLevels).find(key => 
        this.errorLevels[key] === error.level
      );
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;

      // Tip bazlı sayım
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;

      // URL bazlı sayım
      const domain = new URL(error.url).hostname;
      stats.byUrl[domain] = (stats.byUrl[domain] || 0) + 1;

      // Seviye bazlı toplam sayım
      if (error.level >= this.errorLevels.CRITICAL) stats.criticalCount++;
      else if (error.level >= this.errorLevels.ERROR) stats.errorCount++;
      else if (error.level >= this.errorLevels.WARN) stats.warningCount++;
      else if (error.level >= this.errorLevels.INFO) stats.infoCount++;
    });

    return stats;
  }

  // Hata temizleme
  clearErrors(olderThan = null) {
    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);
      
      this.errors = this.errors.filter(error => 
        new Date(error.timestamp) > cutoffDate
      );
    } else {
      this.errors = [];
    }
    
    this.saveErrors();
    this.updateErrorCounter();
  }

  // Hata export
  exportErrors(format = 'json') {
    switch (format) {
      case 'json':
        return JSON.stringify(this.errors, null, 2);
      
      case 'csv':
        return this.convertToCSV(this.errors);
      
      case 'txt':
        return this.convertToText(this.errors);
      
      default:
        return JSON.stringify(this.errors, null, 2);
    }
  }

  // CSV'ye çevir
  convertToCSV(errors) {
    if (errors.length === 0) return '';
    
    const headers = Object.keys(errors[0]);
    const csvContent = [
      headers.join(','),
      ...errors.map(error => 
        headers.map(header => {
          const value = error[header];
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  // Text'e çevir
  convertToText(errors) {
    return errors.map(error => 
      `[${error.timestamp}] ${error.type}: ${error.message}\n` +
      `Level: ${Object.keys(this.errorLevels).find(key => this.errorLevels[key] === error.level)}\n` +
      `URL: ${error.url}\n` +
      `Stack: ${error.stack || 'N/A'}\n` +
      '---'
    ).join('\n\n');
  }

  // Hata seviyesi ayarlama
  setLogLevel(level) {
    if (typeof level === 'string') {
      level = this.errorLevels[level.toUpperCase()];
    }
    
    if (level !== undefined && level >= 0 && level <= 4) {
      this.currentLevel = level;
      localStorage.setItem('errorLogLevel', level.toString());
      console.info(`Log level set to: ${level}`);
    }
  }

  // Hata seviyesi alma
  getLogLevel() {
    return this.currentLevel;
  }

  // Manuel hata oluşturma
  createError(type, message, level = this.errorLevels.ERROR, additionalData = {}) {
    this.handleError({
      type,
      message,
      level,
      ...additionalData
    });
  }

  // Debug log
  debug(message, data = {}) {
    this.createError('debug', message, this.errorLevels.DEBUG, data);
  }

  // Info log
  info(message, data = {}) {
    this.createError('info', message, this.errorLevels.INFO, data);
  }

  // Warning log
  warn(message, data = {}) {
    this.createError('warning', message, this.errorLevels.WARN, data);
  }

  // Error log
  error(message, data = {}) {
    this.createError('error', message, this.errorLevels.ERROR, data);
  }

  // Critical log
  critical(message, data = {}) {
    this.createError('critical', message, this.errorLevels.CRITICAL, data);
  }

  // Network hata yakalama
  setupNetworkErrorHandling() {
    // Fetch API hata yakalama
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.handleError({
            type: 'network_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            level: this.errorLevels.ERROR
          });
        }
        
        return response;
      } catch (error) {
        this.handleError({
          type: 'network_error',
          message: `Fetch failed: ${error.message}`,
          url: args[0],
          error: error.message,
          level: this.errorLevels.ERROR
        });
        throw error;
      }
    };
  }

  // Form validation hata yakalama
  setupFormErrorHandling() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      const invalidFields = form.querySelectorAll(':invalid');
      
      if (invalidFields.length > 0) {
        this.handleError({
          type: 'form_validation_error',
          message: `Form validation failed: ${invalidFields.length} invalid fields`,
          formId: form.id || form.className,
          invalidFields: Array.from(invalidFields).map(field => ({
            name: field.name,
            type: field.type,
            validationMessage: field.validationMessage
          })),
          level: this.errorLevels.WARN
        });
      }
    });
  }

  // Sistem temizleme
  cleanup() {
    // Eski hataları temizle (7 günden eski)
    this.clearErrors(7);
    
    // Hata uyarılarını temizle (30 günden eski)
    const alerts = JSON.parse(localStorage.getItem('errorAlerts') || '[]');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredAlerts = alerts.filter(alert => 
      new Date(alert.timestamp) > thirtyDaysAgo
    );
    
    localStorage.setItem('errorAlerts', JSON.stringify(filteredAlerts));
  }
}

// Global error handler instance
window.errorHandler = new ErrorHandler();

// Hata helper fonksiyonları
function logError(type, message, level = 'ERROR', data = {}) {
  window.errorHandler.createError(type, message, level, data);
}

function logDebug(message, data = {}) {
  window.errorHandler.debug(message, data);
}

function logInfo(message, data = {}) {
  window.errorHandler.info(message, data);
}

function logWarning(message, data = {}) {
  window.errorHandler.warn(message, data);
}

function logCritical(message, data = {}) {
  window.errorHandler.critical(message, data);
}

// Hata seviyesi ayarlama
function setLogLevel(level) {
  window.errorHandler.setLogLevel(level);
}

// Hata istatistikleri alma
function getErrorStats() {
  return window.errorHandler.getErrorStats();
}

// Hataları export etme
function exportErrors(format = 'json') {
  return window.errorHandler.exportErrors(format);
}

// Hataları temizleme
function clearErrors(olderThan = null) {
  window.errorHandler.clearErrors(olderThan);
}

// Sayfa kapanırken temizlik
window.addEventListener('beforeunload', () => {
  if (window.errorHandler) {
    window.errorHandler.cleanup();
  }
});

// Otomatik temizlik (günde bir)
setInterval(() => {
  if (window.errorHandler) {
    window.errorHandler.cleanup();
  }
}, 24 * 60 * 60 * 1000);
