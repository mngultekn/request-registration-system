// Güvenli Input Validation ve Sanitization Sistemi
class InputValidator {
  constructor() {
    this.errors = [];
    this.sanitizedData = {};
  }

  // Ana validation fonksiyonu
  validate(data, rules) {
    this.errors = [];
    this.sanitizedData = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      
      // Required kontrolü
      if (rule.required && !this.isNotEmpty(value)) {
        this.addError(field, `${rule.label || field} alanı zorunludur.`);
        continue;
      }

      // Boş değer kontrolü
      if (!this.isNotEmpty(value)) {
        continue;
      }

      // Sanitize et
      let sanitizedValue = this.sanitize(value, rule.type);

      // Validation kurallarını uygula
      if (rule.minLength && sanitizedValue.length < rule.minLength) {
        this.addError(field, `${rule.label || field} en az ${rule.minLength} karakter olmalıdır.`);
      }

      if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
        this.addError(field, `${rule.label || field} en fazla ${rule.maxLength} karakter olmalıdır.`);
      }

      if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
        this.addError(field, `${rule.label || field} formatı geçersiz.`);
      }

      if (rule.custom && !rule.custom(sanitizedValue)) {
        this.addError(field, rule.customMessage || `${rule.label || field} geçersiz.`);
      }

      // Sanitized değeri kaydet
      this.sanitizedData[field] = sanitizedValue;
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      sanitizedData: this.sanitizedData
    };
  }

  // Boş değer kontrolü
  isNotEmpty(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  // Input sanitization
  sanitize(value, type) {
    if (typeof value !== 'string') return value;

    let sanitized = value.trim();

    switch (type) {
      case 'text':
        // HTML tag'lerini kaldır
        sanitized = this.removeHtmlTags(sanitized);
        // XSS koruması
        sanitized = this.escapeHtml(sanitized);
        break;

      case 'email':
        sanitized = sanitized.toLowerCase();
        sanitized = this.removeHtmlTags(sanitized);
        break;

      case 'ip':
        // IP adresi için özel sanitization
        sanitized = this.sanitizeIP(sanitized);
        break;

      case 'number':
        sanitized = this.sanitizeNumber(sanitized);
        break;

      case 'textarea':
        // HTML tag'lerini kaldır ama satır sonlarını koru
        sanitized = this.removeHtmlTags(sanitized);
        sanitized = this.escapeHtml(sanitized);
        break;
    }

    return sanitized;
  }

  // HTML tag'lerini kaldır
  removeHtmlTags(str) {
    return str.replace(/<[^>]*>/g, '');
  }

  // HTML escape
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // IP adresi sanitization
  sanitizeIP(str) {
    // Sadece IP formatındaki karakterleri kabul et
    return str.replace(/[^0-9.]/g, '');
  }

  // Sayı sanitization
  sanitizeNumber(str) {
    return str.replace(/[^0-9]/g, '');
  }

  // Hata ekleme
  addError(field, message) {
    this.errors.push({
      field,
      message,
      timestamp: new Date().toISOString()
    });
  }

  // Validation kuralları
  static getRules() {
    return {
      ip: {
        required: true,
        label: 'IP Numarası',
        type: 'ip',
        minLength: 7,
        maxLength: 15,
        pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        customMessage: 'Geçerli bir IP adresi girin (örn: 192.168.1.1)'
      },
      fullname: {
        required: true,
        label: 'İsim Soyisim',
        type: 'text',
        minLength: 3,
        maxLength: 50,
        pattern: /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/,
        customMessage: 'Sadece harf ve boşluk kullanın'
      },
      deviceName: {
        required: false,
        label: 'Cihaz Adı',
        type: 'text',
        maxLength: 50
      },
      faultDesc: {
        required: false,
        label: 'Arıza Detayı',
        type: 'textarea',
        maxLength: 200
      },
      materialType: {
        required: false,
        label: 'Malzeme Türü',
        type: 'text',
        maxLength: 30
      },
      materialDesc: {
        required: false,
        label: 'Malzeme Detayı',
        type: 'textarea',
        maxLength: 200
      },
      quantity: {
        required: false,
        label: 'Miktar',
        type: 'number',
        custom: (value) => value >= 1 && value <= 100,
        customMessage: 'Miktar 1-100 arasında olmalıdır'
      },
      otherTitle: {
        required: false,
        label: 'Talep Başlığı',
        type: 'text',
        maxLength: 100
      },
      otherDesc: {
        required: false,
        label: 'Talep Detayı',
        type: 'textarea',
        maxLength: 300
      }
    };
  }

  // Rate limiting kontrolü
  static checkRateLimit(key, maxAttempts = 5, timeWindow = 60000) {
    const now = Date.now();
    const attempts = JSON.parse(localStorage.getItem(`rateLimit_${key}`) || '[]');
    
    // Eski denemeleri temizle
    const recentAttempts = attempts.filter(timestamp => now - timestamp < timeWindow);
    
    if (recentAttempts.length >= maxAttempts) {
      return {
        allowed: false,
        remainingTime: Math.ceil((timeWindow - (now - recentAttempts[0])) / 1000)
      };
    }

    // Yeni denemeyi ekle
    recentAttempts.push(now);
    localStorage.setItem(`rateLimit_${key}`, JSON.stringify(recentAttempts));

    return {
      allowed: true,
      remainingAttempts: maxAttempts - recentAttempts.length
    };
  }

  // CSRF token kontrolü
  static validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrfToken');
    return token === storedToken;
  }

  // XSS koruması için ek kontroller
  static detectXSS(input) {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }
}

// Global validator instance
window.inputValidator = new InputValidator();

// Validation helper fonksiyonları
function validateForm(formData) {
  const rules = InputValidator.getRules();
  return window.inputValidator.validate(formData, rules);
}

function showValidationErrors(errors) {
  // Mevcut hata mesajlarını temizle
  document.querySelectorAll('.error-message').forEach(el => el.remove());
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

  // Yeni hata mesajlarını göster
  errors.forEach(error => {
    const field = document.getElementById(error.field);
    if (field) {
      field.classList.add('input-error');
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = error.message;
      errorDiv.style.cssText = 'color: #dc2626; font-size: 0.85em; margin-top: 4px;';
      
      field.parentNode.appendChild(errorDiv);
    }
  });
}

// Rate limiting kontrolü
function checkFormSubmission() {
  const userIP = document.getElementById('ip')?.value || 'unknown';
  const rateLimit = InputValidator.checkRateLimit(`form_${userIP}`, 3, 60000);
  
  if (!rateLimit.allowed) {
    alert(`Çok fazla deneme yaptınız. ${rateLimit.remainingTime} saniye sonra tekrar deneyin.`);
    return false;
  }
  
  return true;
}
