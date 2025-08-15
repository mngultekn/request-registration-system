// Performans Optimizasyon Sistemi
class PerformanceManager {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.performanceThresholds = {
      pageLoad: 3000,
      domContentLoaded: 1500,
      firstPaint: 1000,
      firstContentfulPaint: 1500,
      longTask: 50,
      memoryUsage: 0.8
    };
    this.init();
  }

  // Sistem başlatma
  init() {
    this.setupPerformanceMonitoring();
    this.setupResourceMonitoring();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.setupLazyLoading();
    this.setupImageOptimization();
    this.setupCodeSplitting();
  }

  // Performans izleme kurulumu
  setupPerformanceMonitoring() {
    // Sayfa yükleme performansı
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.measurePagePerformance();
      }, 0);
    });

    // Navigation Timing API
    if ('performance' in window) {
      this.observeNavigationTiming();
    }

    // Paint Timing API
    if ('PerformanceObserver' in window) {
      this.observePaintTiming();
    }

    // Long Task API
    if ('PerformanceObserver' in window) {
      this.observeLongTasks();
    }

    // Layout Shifts API
    if ('PerformanceObserver' in window) {
      this.observeLayoutShifts();
    }
  }

  // Navigation Timing izleme
  observeNavigationTiming() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.metrics.navigation = {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.responseStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        };

        // Performans uyarıları
        this.checkPerformanceThresholds();
      }
    } catch (error) {
      console.warn('Navigation timing measurement failed:', error);
    }
  }

  // Paint Timing izleme
  observePaintTiming() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.metrics[entry.name] = entry.startTime;
          
          // First Paint ve First Contentful Paint kontrolü
          if (entry.name === 'first-paint') {
            this.metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint timing observation failed:', error);
    }
  }

  // Long Task izleme
  observeLongTasks() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > this.performanceThresholds.longTask) {
            this.handleLongTask(entry);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observation failed:', error);
    }
  }

  // Layout Shift izleme
  observeLayoutShifts() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput && entry.value > 0.1) {
            this.handleLayoutShift(entry);
          }
        });
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Layout shift observation failed:', error);
    }
  }

  // Resource izleme kurulumu
  setupResourceMonitoring() {
    // Resource loading hataları
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackResourceLoad(event.target);
      }
    }, true);

    // Resource loading başarıları
    window.addEventListener('load', (event) => {
      if (event.target !== window) {
        this.trackResourceLoad(event.target);
      }
    }, true);
  }

  // Resource yükleme takibi
  trackResourceLoad(element) {
    const resource = {
      type: element.tagName.toLowerCase(),
      src: element.src || element.href,
      loadTime: performance.now(),
      size: this.estimateResourceSize(element)
    };

    if (!this.metrics.resources) {
      this.metrics.resources = [];
    }
    this.metrics.resources.push(resource);
  }

  // Resource boyutu tahmini
  estimateResourceSize(element) {
    if (element.tagName === 'IMG') {
      return element.naturalWidth * element.naturalHeight * 4; // RGBA bytes
    }
    return 0;
  }

  // Memory izleme kurulumu
  setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        this.measureMemoryUsage();
      }, 10000); // Her 10 saniyede bir
    }
  }

  // Memory kullanımı ölçümü
  measureMemoryUsage() {
    const memory = performance.memory;
    const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    this.metrics.memory = {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usage: usage
    };

    // Memory uyarısı
    if (usage > this.performanceThresholds.memoryUsage) {
      this.handleHighMemoryUsage(usage);
    }
  }

  // Network izleme kurulumu
  setupNetworkMonitoring() {
    // Network Information API
    if ('connection' in navigator) {
      this.metrics.network = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      };
    }

    // Fetch API performance
    this.interceptFetchAPI();
  }

  // Fetch API interception
  interceptFetchAPI() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.trackNetworkRequest(args[0], endTime - startTime, response.status);
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.trackNetworkRequest(args[0], endTime - startTime, 'error');
        throw error;
      }
    };
  }

  // Network request takibi
  trackNetworkRequest(url, duration, status) {
    if (!this.metrics.networkRequests) {
      this.metrics.networkRequests = [];
    }

    this.metrics.networkRequests.push({
      url: url,
      duration: duration,
      status: status,
      timestamp: new Date().toISOString()
    });

    // Son 100 request'i tut
    if (this.metrics.networkRequests.length > 100) {
      this.metrics.networkRequests = this.metrics.networkRequests.slice(-100);
    }
  }

  // Lazy loading kurulumu
  setupLazyLoading() {
    // Intersection Observer ile lazy loading
    if ('IntersectionObserver' in window) {
      this.setupImageLazyLoading();
      this.setupContentLazyLoading();
    }
  }

  // Image lazy loading
  setupImageLazyLoading() {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // Content lazy loading
  setupContentLazyLoading() {
    const contentObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          if (element.dataset.lazyContent) {
            this.loadLazyContent(element);
            contentObserver.unobserve(element);
          }
        }
      });
    });

    document.querySelectorAll('[data-lazy-content]').forEach(element => {
      contentObserver.observe(element);
    });
  }

  // Lazy content yükleme
  loadLazyContent(element) {
    const contentId = element.dataset.lazyContent;
    // Burada AJAX ile content yüklenebilir
    element.innerHTML = `<div>Lazy loaded content: ${contentId}</div>`;
  }

  // Image optimizasyon kurulumu
  setupImageOptimization() {
    // Responsive images
    this.setupResponsiveImages();
    
    // Image compression
    this.setupImageCompression();
  }

  // Responsive images
  setupResponsiveImages() {
    const images = document.querySelectorAll('img[data-srcset]');
    images.forEach(img => {
      const srcset = img.dataset.srcset;
      if (srcset) {
        img.srcset = srcset;
        img.sizes = img.dataset.sizes || '100vw';
      }
    });
  }

  // Image compression
  setupImageCompression() {
    // Canvas ile image compression
    document.querySelectorAll('img[data-compress]').forEach(img => {
      img.addEventListener('load', () => {
        this.compressImage(img);
      });
    });
  }

  // Image compression
  compressImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    ctx.drawImage(img, 0, 0);
    
    // Quality 0.8 ile JPEG olarak export
    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    img.src = compressedDataUrl;
  }

  // Code splitting kurulumu
  setupCodeSplitting() {
    // Dynamic imports için
    this.setupDynamicImports();
    
    // Bundle analysis
    this.analyzeBundleSize();
  }

  // Dynamic imports
  setupDynamicImports() {
    // Lazy load modules
    window.lazyLoadModule = async (moduleName) => {
      try {
        const module = await import(`./modules/${moduleName}.js`);
        return module;
      } catch (error) {
        console.error(`Failed to load module: ${moduleName}`, error);
        return null;
      }
    };
  }

  // Bundle size analysis
  analyzeBundleSize() {
    // Webpack bundle analyzer benzeri
    if (window.webpackChunkload) {
      this.metrics.bundleSize = {
        totalChunks: window.webpackChunkload.length,
        loadedChunks: 0
      };
    }
  }

  // Sayfa performansı ölçümü
  measurePagePerformance() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    this.metrics.pageLoad = {
      navigation: navigation,
      paint: paint,
      timestamp: new Date().toISOString()
    };

    // Core Web Vitals
    this.calculateCoreWebVitals();
    
    // Performans raporu
    this.generatePerformanceReport();
  }

  // Core Web Vitals hesaplama
  calculateCoreWebVitals() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    // Largest Contentful Paint (LCP)
    this.measureLCP();
    
    // First Input Delay (FID)
    this.measureFID();
    
    // Cumulative Layout Shift (CLS)
    this.measureCLS();
  }

  // LCP ölçümü
  measureLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP measurement failed:', error);
      }
    }
  }

  // FID ölçümü
  measureFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID measurement failed:', error);
      }
    }
  }

  // CLS ölçümü
  measureCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.cls = clsValue;
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS measurement failed:', error);
      }
    }
  }

  // Performans eşikleri kontrolü
  checkPerformanceThresholds() {
    const navigation = this.metrics.navigation;
    
    if (navigation) {
      if (navigation.domContentLoaded > this.performanceThresholds.domContentLoaded) {
        this.handlePerformanceIssue('slow_dom_content_loaded', navigation.domContentLoaded);
      }
      
      if (navigation.loadComplete > this.performanceThresholds.pageLoad) {
        this.handlePerformanceIssue('slow_page_load', navigation.loadComplete);
      }
    }

    if (this.metrics.firstPaint > this.performanceThresholds.firstPaint) {
      this.handlePerformanceIssue('slow_first_paint', this.metrics.firstPaint);
    }

    if (this.metrics.firstContentfulPaint > this.performanceThresholds.firstContentfulPaint) {
      this.handlePerformanceIssue('slow_first_contentful_paint', this.metrics.firstContentfulPaint);
    }
  }

  // Performans sorunu işleme
  handlePerformanceIssue(type, value) {
    const issue = {
      type: type,
      value: value,
      threshold: this.performanceThresholds[type.replace('slow_', '')] || 'unknown',
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Error handler'a gönder
    if (window.errorHandler) {
      window.errorHandler.warn(`Performance issue: ${type}`, issue);
    }

    // Notification gönder
    if (window.notificationManager) {
      window.notificationManager.warning(
        'Performans Uyarısı',
        `Sayfa yükleme yavaş: ${type}`,
        { category: 'performance' }
      );
    }
  }

  // Long task işleme
  handleLongTask(entry) {
    const longTask = {
      duration: entry.duration,
      startTime: entry.startTime,
      name: entry.name,
      timestamp: new Date().toISOString()
    };

    // Error handler'a gönder
    if (window.errorHandler) {
      window.errorHandler.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, longTask);
    }
  }

  // Layout shift işleme
  handleLayoutShift(entry) {
    const layoutShift = {
      value: entry.value,
      sources: entry.sources,
      timestamp: new Date().toISOString()
    };

    // Error handler'a gönder
    if (window.errorHandler) {
      window.errorHandler.warn(`Layout shift detected: ${entry.value.toFixed(3)}`, layoutShift);
    }
  }

  // Yüksek memory kullanımı işleme
  handleHighMemoryUsage(usage) {
    const memoryIssue = {
      usage: usage,
      threshold: this.performanceThresholds.memoryUsage,
      timestamp: new Date().toISOString()
    };

    // Error handler'a gönder
    if (window.errorHandler) {
      window.errorHandler.warn(`High memory usage: ${(usage * 100).toFixed(1)}%`, memoryIssue);
    }

    // Garbage collection önerisi
    if (usage > 0.9) {
      this.suggestGarbageCollection();
    }
  }

  // Garbage collection önerisi
  suggestGarbageCollection() {
    // Notification gönder
    if (window.notificationManager) {
      window.notificationManager.warning(
        'Memory Uyarısı',
        'Yüksek memory kullanımı tespit edildi. Sayfa yenilenmesi önerilir.',
        { category: 'performance' }
      );
    }
  }

  // Performans raporu oluşturma
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metrics: this.metrics,
      score: this.calculatePerformanceScore(),
      recommendations: this.generateRecommendations()
    };

    // Raporu kaydet
    this.savePerformanceReport(report);
    
    return report;
  }

  // Performans skoru hesaplama
  calculatePerformanceScore() {
    let score = 100;
    
    // Navigation timing
    if (this.metrics.navigation) {
      if (this.metrics.navigation.domContentLoaded > 1500) score -= 20;
      if (this.metrics.navigation.loadComplete > 3000) score -= 30;
    }
    
    // Paint timing
    if (this.metrics.firstPaint > 1000) score -= 15;
    if (this.metrics.firstContentfulPaint > 1500) score -= 15;
    
    // Memory usage
    if (this.metrics.memory && this.metrics.memory.usage > 0.8) score -= 10;
    
    return Math.max(0, score);
  }

  // Öneriler oluşturma
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.navigation && this.metrics.navigation.domContentLoaded > 1500) {
      recommendations.push('DOM content loaded süresini azaltın');
    }
    
    if (this.metrics.navigation && this.metrics.navigation.loadComplete > 3000) {
      recommendations.push('Sayfa yükleme süresini azaltın');
    }
    
    if (this.metrics.memory && this.metrics.memory.usage > 0.8) {
      recommendations.push('Memory kullanımını optimize edin');
    }
    
    if (this.metrics.resources && this.metrics.resources.length > 20) {
      recommendations.push('Resource sayısını azaltın');
    }
    
    return recommendations;
  }

  // Performans raporunu kaydet
  savePerformanceReport(report) {
    try {
      const reports = JSON.parse(localStorage.getItem('performanceReports') || '[]');
      reports.unshift(report);
      
      // Son 50 raporu tut
      if (reports.length > 50) {
        reports.splice(50);
      }
      
      localStorage.setItem('performanceReports', JSON.stringify(reports));
    } catch (error) {
      console.error('Performance report save failed:', error);
    }
  }

  // Performans raporlarını al
  getPerformanceReports() {
    try {
      return JSON.parse(localStorage.getItem('performanceReports') || '[]');
    } catch (error) {
      return [];
    }
  }

  // Performans metriklerini al
  getPerformanceMetrics() {
    return this.metrics;
  }

  // Performans eşiklerini güncelle
  updatePerformanceThresholds(newThresholds) {
    this.performanceThresholds = { ...this.performanceThresholds, ...newThresholds };
  }

  // Performans izleme durdurma
  stopMonitoring() {
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers = [];
  }

  // Performans optimizasyonu
  optimizePerformance() {
    // Image optimization
    this.optimizeImages();
    
    // CSS optimization
    this.optimizeCSS();
    
    // JavaScript optimization
    this.optimizeJavaScript();
  }

  // Image optimization
  optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      if (img.naturalWidth > 800) {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }
    });
  }

  // CSS optimization
  optimizeCSS() {
    // Critical CSS inline
    const criticalCSS = this.extractCriticalCSS();
    if (criticalCSS) {
      const style = document.createElement('style');
      style.textContent = criticalCSS;
      document.head.appendChild(style);
    }
  }

  // Critical CSS extraction
  extractCriticalCSS() {
    // Basit critical CSS extraction
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    let criticalCSS = '';
    
    styles.forEach(style => {
      if (style.tagName === 'STYLE') {
        criticalCSS += style.textContent;
      }
    });
    
    return criticalCSS;
  }

  // JavaScript optimization
  optimizeJavaScript() {
    // Event delegation
    this.setupEventDelegation();
    
    // Debouncing
    this.setupDebouncing();
  }

  // Event delegation
  setupEventDelegation() {
    // Click events için delegation
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      if (target.matches('[data-action]')) {
        const action = target.dataset.action;
        this.handleDelegatedAction(action, target);
      }
    });
  }

  // Delegated action handling
  handleDelegatedAction(action, element) {
    switch (action) {
      case 'delete':
        this.handleDeleteAction(element);
        break;
      case 'edit':
        this.handleEditAction(element);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  // Delete action
  handleDeleteAction(element) {
    if (confirm('Bu öğeyi silmek istediğinizden emin misiniz?')) {
      element.closest('tr')?.remove();
    }
  }

  // Edit action
  handleEditAction(element) {
    const row = element.closest('tr');
    if (row) {
      row.classList.add('editing');
    }
  }

  // Debouncing setup
  setupDebouncing() {
    // Search input için debouncing
    const searchInputs = document.querySelectorAll('input[type="search"], input[data-search]');
    searchInputs.forEach(input => {
      let debounceTimer;
      input.addEventListener('input', (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.performSearch(event.target.value);
        }, 300);
      });
    });
  }

  // Search performance
  performSearch(query) {
    // Search logic burada
    console.log('Searching for:', query);
  }
}

// Global performance manager instance
window.performanceManager = new PerformanceManager();

// Performance helper fonksiyonları
function getPerformanceMetrics() {
  return window.performanceManager.getPerformanceMetrics();
}

function getPerformanceReports() {
  return window.performanceManager.getPerformanceReports();
}

function generatePerformanceReport() {
  return window.performanceManager.generatePerformanceReport();
}

function optimizePerformance() {
  window.performanceManager.optimizePerformance();
}

function updatePerformanceThresholds(thresholds) {
  window.performanceManager.updatePerformanceThresholds(thresholds);
}

// Sayfa kapanırken temizlik
window.addEventListener('beforeunload', () => {
  if (window.performanceManager) {
    window.performanceManager.stopMonitoring();
  }
});
