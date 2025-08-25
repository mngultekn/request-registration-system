// UI Yönetim Sistemi
class UIManager {
  constructor() {
    this.loadingStates = new Map();
    this.progressBars = new Map();
    this.toasts = [];
    this.modals = [];
    this.init();
  }

  // Sistem başlatma
  init() {
    this.setupLoadingSystem();
    this.setupProgressSystem();
    this.setupToastSystem();
    this.setupModalSystem();
    this.setupResponsiveDesign();
  }

  // Loading sistemi kurulumu
  setupLoadingSystem() {
    // Global loading overlay
    this.createGlobalLoading();
    
    // Button loading states
    this.setupButtonLoading();
  }

  // Global loading overlay oluşturma
  createGlobalLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'globalLoadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    `;
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
  }

  // Global loading göster/gizle
  showGlobalLoading(message = 'Yükleniyor...') {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
      const messageEl = overlay.querySelector('p');
      if (messageEl) messageEl.textContent = message;
      overlay.style.display = 'flex';
    }
  }

  hideGlobalLoading() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Button loading kurulumu
  setupButtonLoading() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-loading]');
      if (button) {
        this.setButtonLoading(button, true);
      }
    });
  }

  // Button loading durumu
  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.innerHTML = '<span class="button-spinner"></span> Yükleniyor...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Gönder';
    }
  }

  // Progress sistemi kurulumu
  setupProgressSystem() {
    // Progress bar container
    this.createProgressContainer();
  }

  // Progress container oluşturma
  createProgressContainer() {
    const container = document.createElement('div');
    container.id = 'progressContainer';
    container.className = 'progress-container';
    document.body.appendChild(container);
  }

  // Progress bar oluşturma
  createProgressBar(id, title = 'İşlem') {
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = `
      <div class="progress-header">
        <span class="progress-title">${title}</span>
        <span class="progress-percentage">0%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
    `;
    
    this.progressBars.set(id, progressBar);
    document.getElementById('progressContainer').appendChild(progressBar);
    return progressBar;
  }

  // Progress güncelleme
  updateProgress(id, percentage, message = '') {
    const progressBar = this.progressBars.get(id);
    if (progressBar) {
      const fill = progressBar.querySelector('.progress-fill');
      const percentageEl = progressBar.querySelector('.progress-percentage');
      
      fill.style.width = `${percentage}%`;
      percentageEl.textContent = `${Math.round(percentage)}%`;
      
      if (message) {
        progressBar.querySelector('.progress-title').textContent = message;
      }
    }
  }

  // Progress bar kaldırma
  removeProgressBar(id) {
    const progressBar = this.progressBars.get(id);
    if (progressBar) {
      progressBar.remove();
      this.progressBars.delete(id);
    }
  }

  // Toast sistemi kurulumu
  setupToastSystem() {
    // Toast container
    this.createToastContainer();
  }

  // Toast container oluşturma
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Toast gösterme
  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
      </div>
      <div class="toast-progress"></div>
    `;
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    // Auto remove
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
    
    // Progress bar
    const progress = toast.querySelector('.toast-progress');
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progressPercent = (elapsed / duration) * 100;
      progress.style.width = `${progressPercent}%`;
      
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    };
    animate();
    
    document.getElementById('toastContainer').appendChild(toast);
    this.toasts.push(toast);
    
    // Slide in animation
    setTimeout(() => toast.classList.add('show'), 100);
  }

  // Toast kaldırma
  removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts = this.toasts.filter(t => t !== toast);
    }, 300);
  }

  // Modal sistemi kurulumu
  setupModalSystem() {
    // Modal container
    this.createModalContainer();
  }

  // Modal container oluşturma
  createModalContainer() {
    const container = document.createElement('div');
    container.id = 'modalContainer';
    container.className = 'modal-container';
    document.body.appendChild(container);
  }

  // Modal oluşturma
  createModal(id, title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = id;
    
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
        ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
      </div>
    `;
    
    // Close events
    modal.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal(id);
    });
    
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
      if (options.closeOnOverlay !== false) {
        this.closeModal(id);
      }
    });
    
    // ESC key
    if (options.closeOnEsc !== false) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeModal(id);
        }
      });
    }
    
    this.modals.push(modal);
    document.getElementById('modalContainer').appendChild(modal);
    
    // Show animation
    setTimeout(() => modal.classList.add('show'), 100);
    
    return modal;
  }

  // Modal gösterme
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show');
    }
  }

  // Modal kapatma
  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        this.modals = this.modals.filter(m => m !== modal);
      }, 300);
    }
  }

  // Responsive design kurulumu
  setupResponsiveDesign() {
    // Viewport change listener
    window.addEventListener('resize', () => {
      this.handleViewportChange();
    });
    
    // Initial setup
    this.handleViewportChange();
  }

  // Viewport değişikliği işleme
  handleViewportChange() {
    const width = window.innerWidth;
    
    if (width < 768) {
      document.body.classList.add('mobile');
      document.body.classList.remove('tablet', 'desktop');
    } else if (width < 1024) {
      document.body.classList.add('tablet');
      document.body.classList.remove('mobile', 'desktop');
    } else {
      document.body.classList.add('desktop');
      document.body.classList.remove('mobile', 'tablet');
    }
  }

  // Loading state yönetimi
  setLoadingState(elementId, isLoading, message = '') {
    const element = document.getElementById(elementId);
    if (element) {
      if (isLoading) {
        element.classList.add('loading');
        if (message) {
          element.setAttribute('data-loading-message', message);
        }
      } else {
        element.classList.remove('loading');
        element.removeAttribute('data-loading-message');
      }
    }
  }

  // Skeleton loading oluşturma
  createSkeletonLoader(container, count = 3) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loader';
    
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div');
      item.className = 'skeleton-item';
      item.innerHTML = `
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      `;
      skeleton.appendChild(item);
    }
    
    container.appendChild(skeleton);
    return skeleton;
  }

  // Skeleton loading kaldırma
  removeSkeletonLoader(container) {
    const skeleton = container.querySelector('.skeleton-loader');
    if (skeleton) {
      skeleton.remove();
    }
  }

  // Infinite scroll kurulumu
  setupInfiniteScroll(container, loadMoreCallback) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMoreCallback();
        }
      });
    });
    
    // Sentinel element
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    container.appendChild(sentinel);
    
    observer.observe(sentinel);
    return observer;
  }

  // Virtual scrolling kurulumu
  setupVirtualScroll(container, items, itemHeight = 50, visibleCount = 10) {
    const totalHeight = items.length * itemHeight;
    const scrollContainer = document.createElement('div');
    scrollContainer.style.height = `${totalHeight}px`;
    scrollContainer.style.position = 'relative';
    
    const visibleContainer = document.createElement('div');
    visibleContainer.style.position = 'absolute';
    visibleContainer.style.top = '0';
    visibleContainer.style.left = '0';
    visibleContainer.style.right = '0';
    
    container.appendChild(scrollContainer);
    scrollContainer.appendChild(visibleContainer);
    
    const renderVisibleItems = () => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount, items.length);
      
      visibleContainer.style.top = `${startIndex * itemHeight}px`;
      visibleContainer.innerHTML = '';
      
      for (let i = startIndex; i < endIndex; i++) {
        const item = document.createElement('div');
        item.style.height = `${itemHeight}px`;
        item.textContent = items[i];
        visibleContainer.appendChild(item);
      }
    };
    
    container.addEventListener('scroll', renderVisibleItems);
    renderVisibleItems();
  }

  // Drag and drop kurulumu
  setupDragAndDrop(draggableElements, dropZones, onDrop) {
    draggableElements.forEach(element => {
      element.draggable = true;
      element.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', element.id);
        element.classList.add('dragging');
      });
      
      element.addEventListener('dragend', () => {
        element.classList.remove('dragging');
      });
    });
    
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedElement = document.getElementById(draggedId);
        
        if (draggedElement && onDrop) {
          onDrop(draggedElement, zone);
        }
      });
    });
  }

  // Keyboard shortcuts kurulumu
  setupKeyboardShortcuts(shortcuts) {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      
      const shortcutKey = `${ctrl ? 'ctrl+' : ''}${shift ? 'shift+' : ''}${alt ? 'alt+' : ''}${key}`;
      
      if (shortcuts[shortcutKey]) {
        e.preventDefault();
        shortcuts[shortcutKey]();
      }
    });
  }

  // Accessibility improvements
  improveAccessibility() {
    // Focus management
    this.setupFocusManagement();
    
    // ARIA labels
    this.setupARIALabels();
    
    // Keyboard navigation
    this.setupKeyboardNavigation();
  }

  // Focus management
  setupFocusManagement() {
    // Focus trap for modals
    this.modals.forEach(modal => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
    });
  }

  // ARIA labels setup
  setupARIALabels() {
    // Button labels
    document.querySelectorAll('button:not([aria-label])').forEach(button => {
      if (!button.textContent.trim()) {
        button.setAttribute('aria-label', button.title || 'Button');
      }
    });
    
    // Form labels
    document.querySelectorAll('input:not([aria-label])').forEach(input => {
      const label = input.previousElementSibling;
      if (label && label.tagName === 'LABEL') {
        input.setAttribute('aria-label', label.textContent);
      }
    });
  }

  // Keyboard navigation
  setupKeyboardNavigation() {
    // Tab navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    // Mouse navigation
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  // Theme switching
  setupThemeSwitcher() {
    const themes = ['light', 'dark', 'auto'];
    let currentTheme = localStorage.getItem('theme') || 'auto';
    
    const switchTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      currentTheme = theme;
    };
    
    // Initial theme
    switchTheme(currentTheme);
    
    // Theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = '🌙';
    themeToggle.addEventListener('click', () => {
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      switchTheme(themes[nextIndex]);
      
      // Update icon
      themeToggle.innerHTML = themes[nextIndex] === 'dark' ? '☀️' : '🌙';
    });
    
    document.body.appendChild(themeToggle);
  }

  // Cleanup
  cleanup() {
    // Remove all toasts
    this.toasts.forEach(toast => this.removeToast(toast));
    
    // Close all modals
    this.modals.forEach(modal => {
      if (modal.id) {
        this.closeModal(modal.id);
      }
    });
    
    // Remove progress bars
    this.progressBars.forEach((bar, id) => this.removeProgressBar(id));
    
    // Hide global loading
    this.hideGlobalLoading();
  }
}

// Global UI manager instance
window.uiManager = new UIManager();

// UI helper fonksiyonları
function showLoading(message = 'Yükleniyor...') {
  window.uiManager.showGlobalLoading(message);
}

function hideLoading() {
  window.uiManager.hideGlobalLoading();
}

function showToast(message, type = 'info', duration = 5000) {
  window.uiManager.showToast(message, type, duration);
}

function showModal(id, title, content, options = {}) {
  return window.uiManager.createModal(id, title, content, options);
}

function closeModal(id) {
  window.uiManager.closeModal(id);
}

function createProgressBar(id, title) {
  return window.uiManager.createProgressBar(id, title);
}

function updateProgress(id, percentage, message) {
  window.uiManager.updateProgress(id, percentage, message);
}

function setButtonLoading(button, isLoading) {
  window.uiManager.setButtonLoading(button, isLoading);
}

// Sayfa kapanırken temizlik
window.addEventListener('beforeunload', () => {
  if (window.uiManager) {
    window.uiManager.cleanup();
  }
});
