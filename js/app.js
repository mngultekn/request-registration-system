// --- Utility Functions for DataManager ---
const NEW_RECORD_KEY = 'lastRecordTime';

// Get all records from DataManager
function getRecords() {
  if (window.dataManager) {
    return window.dataManager.getRecords();
  }
  // Fallback to localStorage if DataManager not available
  const data = localStorage.getItem('faultRecords');
  return data ? JSON.parse(data) : [];
}

// Save all records using DataManager
function saveRecords(records) {
  if (window.dataManager) {
    return window.dataManager.saveRecords(records);
  }
  // Fallback to localStorage if DataManager not available
  localStorage.setItem('faultRecords', JSON.stringify(records));
  return true;
}

// Generate a unique ID for each record
function generateId() {
  return 'f_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

// --- DOM Elements ---
const faultForm = document.getElementById('faultForm');
const requestTypeSelect = document.getElementById('requestType');
const ipInput = document.getElementById('ip');
const fullnameInput = document.getElementById('fullname');
const deviceNameInput = document.getElementById('deviceName');
const faultDescInput = document.getElementById('faultDesc');
const solutionInput = document.getElementById('solution');
const materialTypeSelect = document.getElementById('materialType');
const materialDescInput = document.getElementById('materialDesc');
const quantityInput = document.getElementById('quantity');
const otherTitleInput = document.getElementById('otherTitle');
const otherDescInput = document.getElementById('otherDesc');
const otherPrioritySelect = document.getElementById('otherPriority');
const prioritySelect = document.getElementById('priority');
const arizaFields = document.getElementById('arizaFields');
const malzemeFields = document.getElementById('malzemeFields');
const digerFields = document.getElementById('digerFields');
const faultList = document.getElementById('faultList');
const noRecords = document.getElementById('noRecords');
const modal = document.getElementById('modal');
const modalDetails = document.getElementById('modalDetails');
const modalClose = document.getElementById('modalClose');

// --- Talep Türü Değişikliği ---
requestTypeSelect.addEventListener('change', function() {
  const selectedType = this.value;
  arizaFields.style.display = 'none';
  malzemeFields.style.display = 'none';
  digerFields.style.display = 'none';
  
  if (selectedType === 'ariza') {
    arizaFields.style.display = 'block';
    // Arıza alanlarını zorunlu yap
    deviceNameInput.required = true;
    faultDescInput.required = true;
    // Diğer alanları zorunlu olmaktan çıkar
    materialTypeSelect.required = false;
    materialDescInput.required = false;
    quantityInput.required = false;
    otherTitleInput.required = false;
    otherDescInput.required = false;
  } else if (selectedType === 'malzeme') {
    malzemeFields.style.display = 'block';
    // Malzeme alanlarını zorunlu yap
    materialTypeSelect.required = true;
    materialDescInput.required = true;
    quantityInput.required = true;
    // Diğer alanları zorunlu olmaktan çıkar
    deviceNameInput.required = false;
    faultDescInput.required = false;
    otherTitleInput.required = false;
    otherDescInput.required = false;
  } else if (selectedType === 'diger') {
    digerFields.style.display = 'block';
    // Diğer alanlarını zorunlu yap
    otherTitleInput.required = true;
    otherDescInput.required = true;
    // Diğer alanları zorunlu olmaktan çıkar
    deviceNameInput.required = false;
    faultDescInput.required = false;
    materialTypeSelect.required = false;
    materialDescInput.required = false;
    quantityInput.required = false;
  }
});

// --- Arama ve Filtreleme Değişkenleri ---
let currentSearchTerm = '';
let currentFilter = 'all';
let currentStatusFilter = 'all';

// --- Arama ve Filtreleme Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const statusFilterButtons = document.querySelectorAll('.status-filter-btn');
  
  // Arama input listener
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      currentSearchTerm = this.value.toLowerCase();
      renderList();
    });
  }
  
  // Talep türü filtre butonları
  filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      filterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderList();
    });
  });
  
  // Durum filtre butonları
  statusFilterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      statusFilterButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentStatusFilter = this.dataset.status;
      renderList();
    });
  });
});

// --- İstatistik Hesaplama ---
function updateStats() {
  const records = getRecords();
  const userIP = getUserIP();
  
  let validRecords = records.filter(record => {
    if (!record || !record.id || !record.ip || !record.fullname) {
      return false;
    }
    if (record.requestType === 'ariza') {
      return record.deviceName && record.faultDesc;
    } else if (record.requestType === 'malzeme') {
      return record.materialType && record.materialDesc && record.quantity;
    } else if (record.requestType === 'diger') {
      return record.otherTitle && record.otherDesc;
    }
    if (!record.requestType) {
      return record.deviceName && record.faultDesc;
    }
    return true;
  });
  
  // Kullanıcının sadece kendi taleplerini say
  if (userIP) {
    validRecords = validRecords.filter(record => record.ip === userIP);
  }
  
  // Toplam talep sayısı
  document.getElementById('totalRequests').textContent = validRecords.length;
  
  // Bekleyen talep sayısı
  const pendingCount = validRecords.filter(record => 
    record.status === 'Onay Bekliyor' || record.status === 'Onaylandı' || record.status === 'İletildi'
  ).length;
  document.getElementById('pendingRequests').textContent = pendingCount;
  
  // Tamamlanan talep sayısı
  const completedCount = validRecords.filter(record => 
    record.status === 'Tamamlandı'
  ).length;
  document.getElementById('completedRequests').textContent = completedCount;
  
  // Bu ayki talep sayısı
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const thisMonthCount = validRecords.filter(record => {
    const recordDate = new Date(record.timestamp);
    return recordDate.getMonth() === thisMonth && recordDate.getFullYear() === thisYear;
  }).length;
  document.getElementById('thisMonthRequests').textContent = thisMonthCount;
}

// --- Kullanıcının IP Adresini Al ---
function getUserIP() {
  // Kullanıcının IP adresini localStorage'dan al veya form input'undan al
  const currentIP = localStorage.getItem('userCurrentIP');
  if (currentIP) return currentIP;
  
  // Form input'undan al
  const ipInput = document.getElementById('ip');
  if (ipInput && ipInput.value.trim()) {
    const ip = ipInput.value.trim();
    localStorage.setItem('userCurrentIP', ip);
    return ip;
  }
  
  return null;
}

// --- Kayıtları Listele ---
function renderList() {
  const records = getRecords();
  const userIP = getUserIP();
  
  // Geçersiz kayıtları filtrele
  let validRecords = records.filter(record => {
    // Temel alanların kontrolü
    if (!record || !record.id || !record.ip || !record.fullname) {
      return false;
    }
    
    // Talep türüne göre gerekli alanların kontrolü
    if (record.requestType === 'ariza') {
      return record.deviceName && record.faultDesc;
    } else if (record.requestType === 'malzeme') {
      return record.materialType && record.materialDesc && record.quantity;
    } else if (record.requestType === 'diger') {
      return record.otherTitle && record.otherDesc;
    }
    
    // Eski kayıtlar için (requestType yoksa) eski format kontrolü
    if (!record.requestType) {
      return record.deviceName && record.faultDesc;
    }
    
    return true;
  });
  
  // Arama filtreleme
  if (currentSearchTerm) {
    validRecords = validRecords.filter(record => {
      const searchFields = [
        record.ip || '',
        record.fullname || '',
        record.deviceName || '',
        record.faultDesc || '',
        record.materialType || '',
        record.materialDesc || '',
        record.otherTitle || '',
        record.otherDesc || '',
        record.solution || ''
      ].join(' ').toLowerCase();
      
      return searchFields.includes(currentSearchTerm);
    });
  }
  
  // Talep türü filtreleme
  if (currentFilter !== 'all') {
    validRecords = validRecords.filter(record => record.requestType === currentFilter);
  }
  
  // Durum filtreleme
  if (currentStatusFilter !== 'all') {
    validRecords = validRecords.filter(record => record.status === currentStatusFilter);
  }
  
  // Kullanıcının sadece kendi taleplerini görmesi için IP filtreleme
  if (userIP) {
    validRecords = validRecords.filter(record => record.ip === userIP);
  }
  
  faultList.innerHTML = '';
  if (validRecords.length === 0) {
    noRecords.style.display = 'block';
    return;
  }
  noRecords.style.display = 'none';
  validRecords.forEach(record => {
    // Durum etiketi
    let statusClass = 'status-bekliyor';
    if (record.status === 'Onay Bekliyor') statusClass = 'status-onay-bekliyor';
    if (record.status === 'Onaylandı') statusClass = 'status-onaylandi';
    if (record.status === 'İletildi') statusClass = 'status-iletilen';
    if (record.status === 'Tamamlandı') statusClass = 'status-tamamlandi';
    if (record.status === 'İşleniyor') statusClass = 'status-isleniyor';
    if (record.status === 'Çözüldü') statusClass = 'status-cozuldu';
    
    // Talep türüne göre renk sınıfı
    let typeClass = '';
    if (record.requestType === 'ariza') {
      typeClass = 'kart-ariza';
    } else if (record.requestType === 'malzeme') {
      typeClass = 'kart-malzeme';
    } else if (record.requestType === 'diger') {
      typeClass = 'kart-diger';
    }
    
    const li = document.createElement('li');
    li.className = `fault-item ${typeClass}`;
    li.tabIndex = 0;
    const infoDiv = document.createElement('div');
    infoDiv.className = 'fault-info';
    
    let deviceInfo = '';
    if (record.requestType === 'ariza') {
      deviceInfo = `${escapeHtml(record.deviceName || '')} - ${escapeHtml(record.fullname || '')}`;
    } else if (record.requestType === 'malzeme') {
      deviceInfo = `${escapeHtml(record.materialType || '')} (${record.quantity || ''} adet) - ${escapeHtml(record.fullname || '')}`;
    } else if (record.requestType === 'diger') {
      deviceInfo = `${escapeHtml(record.otherTitle || '')} - ${escapeHtml(record.fullname || '')}`;
    } else {
      // Eski kayıtlar için
      deviceInfo = `${escapeHtml(record.deviceName || '')} - ${escapeHtml(record.fullname || '')}`;
    }
    
    let descInfo = '';
    if (record.requestType === 'ariza') {
      descInfo = escapeHtml(shorten(record.faultDesc || '', 40));
    } else if (record.requestType === 'malzeme') {
      descInfo = escapeHtml(shorten(record.materialDesc || '', 40));
    } else if (record.requestType === 'diger') {
      descInfo = escapeHtml(shorten(record.otherDesc || '', 40));
    } else {
      // Eski kayıtlar için
      descInfo = escapeHtml(shorten(record.faultDesc || '', 40));
    }
    
    let requestTypeLabel = '';
    if (record.requestType === 'ariza') {
      requestTypeLabel = 'Arıza';
    } else if (record.requestType === 'malzeme') {
      requestTypeLabel = 'Malzeme';
    } else if (record.requestType === 'diger') {
      requestTypeLabel = 'Diğer';
    } else {
      requestTypeLabel = 'Talep';
    }
    
    // Öncelik etiketi
    const priorityText = record.priority || 'normal';
    const priorityLabel = priorityText === 'dusuk' ? 'Düşük' : 
                         priorityText === 'normal' ? 'Normal' : 
                         priorityText === 'yuksek' ? 'Yüksek' : 'Acil';
    
    infoDiv.innerHTML = `
      <div class="fault-device">${deviceInfo}</div>
      <div class="fault-desc">${descInfo}</div>
      <div style="margin-top:8px;">
        <span class="status-label ${statusClass}">${record.status||'Bekliyor'}</span>
        <span class="priority-label priority-${priorityText}">${priorityLabel}</span>
        <span style="margin-left:8px; font-size:0.9em; color:#666;">
          ${requestTypeLabel}
        </span>
      </div>
    `;
    infoDiv.addEventListener('click', e => {
      e.stopPropagation();
      showModal(record);
    });
    infoDiv.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        showModal(record);
      }
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Sil';
    delBtn.title = 'Bu kaydı sil';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteRecord(record.id);
    });
    li.appendChild(infoDiv);
    li.appendChild(delBtn);
    faultList.appendChild(li);
  });
  
  // İstatistikleri güncelle
  updateStats();
}

// --- Talep Ekleme ---
faultForm.addEventListener('submit', function(e) {
  e.preventDefault();
  
  // Rate limiting kontrolü
  if (!checkFormSubmission()) {
    return;
  }
  
  // CSRF token kontrolü
  const csrfToken = generateCSRFToken();
  
  const requestType = requestTypeSelect.value;
  const ip = ipInput.value.trim();
  const fullname = fullnameInput.value.trim();
  
  // Güvenli validation sistemi
  const formData = {
    requestType,
    ip,
    fullname,
    deviceName: deviceNameInput.value.trim(),
    faultDesc: faultDescInput.value.trim(),
    solution: solutionInput.value.trim(),
    materialType: materialTypeSelect.value,
    materialDesc: materialDescInput.value.trim(),
    quantity: quantityInput.value,
    otherTitle: otherTitleInput.value.trim(),
    otherDesc: otherDescInput.value.trim(),
    priority: prioritySelect.value,
    csrfToken
  };
  
  // Validation kurallarını uygula
  const validation = validateForm(formData);
  
  if (!validation.isValid) {
    showValidationErrors(validation.errors);
    return;
  }
  
  // XSS koruması
  if (InputValidator.detectXSS(ip) || InputValidator.detectXSS(fullname)) {
    alert('Güvenlik uyarısı: Geçersiz karakterler tespit edildi!');
    return;
  }
  
  let newRecord = {
    id: generateId(),
    requestType: requestType,
    ip,
    fullname,
    priority: prioritySelect.value,
    status: 'Onay Bekliyor', // Yeni varsayılan durum
    timestamp: new Date().toISOString(),
    processHistory: [
      {
        status: 'Onay Bekliyor',
        timestamp: new Date().toISOString(),
        note: 'Talep oluşturuldu'
      }
    ]
  };
  
  if (requestType === 'ariza') {
    const deviceName = deviceNameInput.value.trim();
    const faultDesc = faultDescInput.value.trim();
    const solution = solutionInput.value.trim();
    
    if (!deviceName || !faultDesc) {
      alert('Lütfen arıza ile ilgili gerekli alanları doldurun.');
      return;
    }
    
    newRecord = {
      ...newRecord,
      deviceName,
      faultDesc,
      solution
    };
  } else if (requestType === 'malzeme') {
    const materialType = materialTypeSelect.value;
    const materialDesc = materialDescInput.value.trim();
    const quantity = quantityInput.value;
    
    if (!materialType || !materialDesc || !quantity) {
      alert('Lütfen malzeme ile ilgili gerekli alanları doldurun.');
      return;
    }
    
    newRecord = {
      ...newRecord,
      materialType,
      materialDesc,
      quantity: parseInt(quantity)
    };
  } else if (requestType === 'diger') {
    const otherTitle = otherTitleInput.value.trim();
    const otherDesc = otherDescInput.value.trim();

    if (!otherTitle || !otherDesc) {
      alert('Lütfen diğer talep ile ilgili gerekli alanları doldurun.');
      return;
    }

    newRecord = {
      ...newRecord,
      otherTitle,
      otherDesc
    };
  }
  
  const records = getRecords();
  records.unshift(newRecord);
  saveRecords(records);
  // Yeni kayıt zamanını kaydet
  localStorage.setItem(NEW_RECORD_KEY, Date.now().toString());
  renderList();
  faultForm.reset();
  arizaFields.style.display = 'none';
  malzemeFields.style.display = 'none';
  digerFields.style.display = 'none';
  requestTypeSelect.focus();
  
  // Başarı bildirimi göster
  const requestTypeText = requestType === 'ariza' ? 'Arıza Talebi' : 
                         requestType === 'malzeme' ? 'Malzeme Talebi' : 'Diğer Talep';
  showNotification(`✅ ${requestTypeText} başarıyla eklendi!`, 'success');
});

// --- Kayıt Silme ---
function deleteRecord(id) {
  if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
  let records = getRecords();
  const deleted = records.find(r => r.id === id);
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  // Silinen kaydı ayrı bir localStorage anahtarına ekle (undefined kontrolü)
  if (deleted && deleted.id) {
    deleted.deletedBy = 'Kullanıcı';
    deleted.deletedFrom = 'Kullanıcı Paneli';
    let deletedRecords = JSON.parse(localStorage.getItem('deletedFaultRecords') || '[]');
    deletedRecords.unshift(deleted);
    localStorage.setItem('deletedFaultRecords', JSON.stringify(deletedRecords));
    console.log('Silinen kayıt eklendi:', deleted);
    console.log('deletedFaultRecords (sonra):', JSON.parse(localStorage.getItem('deletedFaultRecords')));
  } else {
    console.log('Silinen kayıt bulunamadı veya undefined:', deleted);
  }
  renderList();
  if (modal.classList.contains('active') && modal.dataset.recordId === id) {
    closeModal();
  }
}

// --- Modal Göster ---
function showModal(record) {
  // Öncelik etiketi
  const priorityText = record.priority || 'normal';
  const priorityLabel = priorityText === 'dusuk' ? 'Düşük' : 
                       priorityText === 'normal' ? 'Normal' : 
                       priorityText === 'yuksek' ? 'Yüksek' : 'Acil';
  
  let modalContent = `
    <div class="modal-header">
      <div class="modal-title">
        <span class="modal-type-badge">${record.requestType === 'ariza' ? '🔧 Arıza' : record.requestType === 'malzeme' ? '📦 Malzeme' : '📝 Diğer'}</span>
        <span class="priority-label priority-${priorityText}">${priorityLabel}</span>
      </div>
      <div class="modal-status">
        <span class="status-label status-${(record.status||'Onay Bekliyor').toLowerCase().replace(' ', '')}">${record.status||'Onay Bekliyor'}</span>
      </div>
    </div>
    
    <div class="modal-info-grid">
      <div class="info-item">
        <label>IP Numarası:</label>
        <span>${escapeHtml(record.ip)}</span>
      </div>
      <div class="info-item">
        <label>İsim Soyisim:</label>
        <span>${escapeHtml(record.fullname)}</span>
      </div>
      <div class="info-item">
        <label>Tarih:</label>
        <span>${formatDate(record.timestamp)}</span>
      </div>
  `;
  
  if (record.requestType === 'ariza') {
    modalContent += `
      <div class="info-item full-width">
        <label>Cihaz Adı:</label>
        <span>${escapeHtml(record.deviceName)}</span>
      </div>
      <div class="info-item full-width">
        <label>Arıza Detayı:</label>
        <span>${escapeHtml(record.faultDesc)}</span>
      </div>
      ${record.solution ? `
      <div class="info-item full-width">
        <label>Çözüm Önerisi:</label>
        <span>${escapeHtml(record.solution)}</span>
      </div>
      ` : ''}
    `;
  } else if (record.requestType === 'malzeme') {
    modalContent += `
      <div class="info-item">
        <label>Malzeme Türü:</label>
        <span>${escapeHtml(record.materialType)}</span>
      </div>
      <div class="info-item">
        <label>Miktar:</label>
        <span>${record.quantity} adet</span>
      </div>
      <div class="info-item full-width">
        <label>Malzeme Detayı:</label>
        <span>${escapeHtml(record.materialDesc)}</span>
      </div>
    `;
  } else if (record.requestType === 'diger') {
    modalContent += `
      <div class="info-item full-width">
        <label>Başlık:</label>
        <span>${escapeHtml(record.otherTitle)}</span>
      </div>
      <div class="info-item full-width">
        <label>Açıklama:</label>
        <span>${escapeHtml(record.otherDesc)}</span>
      </div>
    `;
  }
  
  modalContent += `</div>`;
  
  modalDetails.innerHTML = modalContent;
  modal.classList.add('active');
  modal.dataset.recordId = record.id;
  modalClose.focus();
}

function closeModal() {
  modal.classList.remove('active');
  modalDetails.innerHTML = '';
  modal.dataset.recordId = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', function(e) {
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', function(e) {
  if (modal.classList.contains('active') && e.key === 'Escape') {
    closeModal();
  }
});

// --- Kısa Metin ---
function shorten(text, maxLen) {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

// --- HTML Kaçış ---
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

// --- Bildirim Fonksiyonları ---
function showNotification(message, type = 'success') {
  const notification = document.getElementById('userNotification');
  const messageSpan = document.getElementById('notificationMessage');
  
  if (notification && messageSpan) {
    messageSpan.textContent = message;
    notification.className = `user-notification ${type}`;
    notification.style.display = 'flex';
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
      hideNotification();
    }, 5000);
  }
}

function hideNotification() {
  const notification = document.getElementById('userNotification');
  if (notification) {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      notification.style.display = 'none';
      notification.style.animation = '';
    }, 300);
  }
}

// --- Sayfa Yüklenince ---
renderList();
window.addEventListener('storage', function(e) {
  if (e.key === 'faultRecords') {
    renderList();
  }
});

// localStorage değişikliklerini dinle (aynı sekme içinde)
function setupStorageListener() {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'faultRecords') {
      // Aynı sekme içinde değişiklik olduğunda listeyi güncelle
      setTimeout(() => {
        renderList();
      }, 100);
    }
  };
}

// Storage listener'ı başlat
setupStorageListener();

// ESC tuşu ile modal kapatma
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (modal.classList.contains('active')) {
      closeModal();
    }
  }
});

// Tarih formatı fonksiyonu
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
} 