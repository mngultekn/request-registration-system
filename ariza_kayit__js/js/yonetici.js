// Yönetici Giriş ve Panel JS
const adminLoginForm = document.getElementById('adminLoginForm');
const loginPanel = document.getElementById('loginPanel');
const loginError = document.getElementById('loginError');
const yoneticiPanel = document.getElementById('yoneticiPanel');
const adminFaultList = document.getElementById('adminFaultList');
const adminNoRecords = document.getElementById('adminNoRecords');
const adminAlert = document.getElementById('adminAlert');
const adminSound = document.getElementById('adminSound');
const modal = document.getElementById('modal');
const modalDetails = document.getElementById('modalDetails');
const modalClose = document.getElementById('modalClose');
const filterButtons = document.querySelectorAll('.filter-btn');

const STORAGE_KEY = 'faultRecords';
const NEW_RECORD_KEY = 'lastRecordTime';
let lastRecordCount = 0;
let lastRecordTime = 0;
let pollInterval = null;
let currentFilter = 'all';
let currentStatusFilter = 'all'; // Yeni eklenen durum filtreleme için

function getRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Sayfa yüklenince oturum kontrolü
window.addEventListener('DOMContentLoaded', function() {
  // Oturum kontrolü - eğer giriş yapılmışsa paneli göster
  if (localStorage.getItem('isAdminLoggedIn') === 'true') {
    showAdminPanel();
  } else {
    showLoginPanel();
  }
});

// Giriş kontrolü
adminLoginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  if (user === 'admin' && pass === '12345') {
    showAdminPanel();
    localStorage.setItem('isAdminLoggedIn', 'true');
  } else {
    loginError.style.display = 'block';
    setTimeout(() => { loginError.style.display = 'none'; }, 2000);
  }
});

// Panel gösterme fonksiyonları
function showAdminPanel() {
  loginPanel.style.display = 'none';
  yoneticiPanel.style.display = 'block';
  renderAdminList();
  checkForNewRecord();
  startPolling();
}

function showLoginPanel() {
  loginPanel.style.display = 'block';
  yoneticiPanel.style.display = 'none';
  if (pollInterval) clearInterval(pollInterval);
}

// Çıkış fonksiyonu
function adminLogout() {
  localStorage.removeItem('isAdminLoggedIn');
  showLoginPanel();
}

// Filtreleme butonları
filterButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    const filter = this.dataset.filter;
    const statusFilter = this.dataset.statusFilter;
    
    if (filter) {
      currentFilter = filter;
    }
    if (statusFilter) {
      currentStatusFilter = statusFilter;
    }
    
    // Aktif buton stilini güncelle
    filterButtons.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    
    renderAdminList();
  });
});

// Durum filtreleme butonları
const statusFilterButtons = document.querySelectorAll('[data-status-filter]');
statusFilterButtons.forEach(btn => {
  btn.addEventListener('click', function() {
    const statusFilter = this.dataset.statusFilter;
    currentStatusFilter = statusFilter;
    
    // Aktif buton stilini güncelle
    statusFilterButtons.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    
    renderAdminList();
  });
});

function renderAdminList() {
  let records = getRecords();
  
  // Geçersiz kayıtları filtrele
  records = records.filter(record => {
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
  
  // Filtreleme uygula
  if (currentFilter === 'ariza') {
    records = records.filter(record => record.requestType === 'ariza');
  } else if (currentFilter === 'malzeme') {
    records = records.filter(record => record.requestType === 'malzeme');
  } else if (currentFilter === 'diger') {
    records = records.filter(record => record.requestType === 'diger');
  }
  
  // Durum filtreleme uygula
  if (currentStatusFilter === 'onay-bekliyor') {
    records = records.filter(record => record.status === 'Onay Bekliyor');
  } else if (currentStatusFilter === 'onaylandi') {
    records = records.filter(record => record.status === 'Onaylandı');
  } else if (currentStatusFilter === 'iletilen') {
    records = records.filter(record => record.status === 'İletildi');
  } else if (currentStatusFilter === 'tamamlandi') {
    records = records.filter(record => record.status === 'Tamamlandı');
  }
  
  adminFaultList.innerHTML = '';
  if (records.length === 0) {
    adminNoRecords.style.display = 'block';
    lastRecordCount = 0;
    return;
  }
  adminNoRecords.style.display = 'none';
  records.forEach(record => {
    // Durum sınıfı
    let statusClass = 'status-onay-bekliyor';
    if (record.status === 'Onay Bekliyor') statusClass = 'status-onay-bekliyor';
    if (record.status === 'Onaylandı') statusClass = 'status-onaylandi';
    if (record.status === 'İletildi') statusClass = 'status-iletilen';
    if (record.status === 'İşleniyor') statusClass = 'status-isleniyor';
    if (record.status === 'Tamamlandı') statusClass = 'status-tamamlandi';
    if (record.status === 'Çözüldü') statusClass = 'status-cozuldu'; // Eski kayıtlar için
    
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
      deviceInfo = `${escapeHtml(record.deviceName||'')} - ${escapeHtml(record.fullname||'')}`;
    } else if (record.requestType === 'malzeme') {
      deviceInfo = `${escapeHtml(record.materialType||'')} (${record.quantity||''} adet) - ${escapeHtml(record.fullname||'')}`;
    } else if (record.requestType === 'diger') {
      deviceInfo = `${escapeHtml(record.otherTitle||'')} - ${escapeHtml(record.fullname||'')}`;
    } else {
      // Eski kayıtlar için
      deviceInfo = `${escapeHtml(record.deviceName||'')} - ${escapeHtml(record.fullname||'')}`;
    }
    
    let descInfo = '';
    if (record.requestType === 'ariza') {
      descInfo = escapeHtml(shorten(record.faultDesc||'', 40));
    } else if (record.requestType === 'malzeme') {
      descInfo = escapeHtml(shorten(record.materialDesc||'', 40));
    } else if (record.requestType === 'diger') {
      descInfo = escapeHtml(shorten(record.otherDesc||'', 40));
    } else {
      // Eski kayıtlar için
      descInfo = escapeHtml(shorten(record.faultDesc||'', 40));
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
    
    infoDiv.innerHTML = `
      <div class="fault-device">${deviceInfo}</div>
      <div class="fault-desc">${descInfo}</div>
      <div class="status-row">
        <span class="status-label ${statusClass}">${record.status||'Onay Bekliyor'}</span>
        <select onchange="changeStatus('${record.id}', this.value)">
          <option value="Onay Bekliyor" ${record.status==='Onay Bekliyor'?'selected':''}>Onay Bekliyor</option>
          <option value="Onaylandı" ${record.status==='Onaylandı'?'selected':''}>Onaylandı</option>
          <option value="İletildi" ${record.status==='İletildi'?'selected':''}>İletildi</option>
          <option value="İşleniyor" ${record.status==='İşleniyor'?'selected':''}>İşleniyor</option>
          <option value="Tamamlandı" ${record.status==='Tamamlandı'?'selected':''}>Tamamlandı</option>
        </select>
        <span style="font-size:0.95em; color:#888; margin-left:10px;">${formatDate(record.timestamp)}</span>
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
    // Durum dropdown'una tıklanınca modal açılmasını engelle
    infoDiv.querySelector('select').addEventListener('click', function(e) { e.stopPropagation(); });
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
    adminFaultList.appendChild(li);
  });
}

function deleteRecord(id) {
  if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
  let records = getRecords();
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  renderAdminList();
  if (modal.classList.contains('active') && modal.dataset.recordId === id) {
    closeModal();
  }
}

function showModal(record) {
  let modalContent = `
    <p><strong>IP Numarası:</strong><br>${escapeHtml(record.ip)}</p>
    <p><strong>İsim Soyisim:</strong><br>${escapeHtml(record.fullname)}</p>
  `;
  
  if (record.requestType === 'ariza') {
    modalContent += `
      <p><strong>Talep Türü:</strong><br>Arıza Talebi</p>
      <p><strong>Cihaz Adı:</strong><br>${escapeHtml(record.deviceName)}</p>
      <p><strong>Arıza Detayı:</strong><br>${escapeHtml(record.faultDesc)}</p>
      <p><strong>Çözüm:</strong><br>${record.solution ? escapeHtml(record.solution) : '<em>Çözüm girilmemiş.</em>'}</p>
    `;
  } else if (record.requestType === 'malzeme') {
    modalContent += `
      <p><strong>Talep Türü:</strong><br>Malzeme Talebi</p>
      <p><strong>Malzeme Türü:</strong><br>${escapeHtml(record.materialType)}</p>
      <p><strong>Malzeme Detayı:</strong><br>${escapeHtml(record.materialDesc)}</p>
      <p><strong>Miktar:</strong><br>${record.quantity} adet</p>
    `;
  } else if (record.requestType === 'diger') {
    modalContent += `
      <p><strong>Talep Türü:</strong><br>Diğer Talebi</p>
      <p><strong>Başlık:</strong><br>${escapeHtml(record.otherTitle)}</p>
      <p><strong>Açıklama:</strong><br>${escapeHtml(record.otherDesc)}</p>
    `;
  }
  
  modalContent += `
    <p><strong>Durum:</strong> <span class="status-label status-${(record.status||'Onay Bekliyor').toLowerCase().replace(' ', '')}">${record.status||'Onay Bekliyor'}</span></p>
    <p><strong>Tarih/Saat:</strong> ${formatDate(record.timestamp)}</p>
  `;
  
  // İşlem geçmişi varsa göster
  if (record.processHistory && record.processHistory.length > 0) {
    modalContent += `<p><strong>İşlem Geçmişi:</strong></p><div style="max-height:200px; overflow-y:auto; background:#f8fafc; padding:12px; border-radius:6px; margin-top:8px;">`;
    record.processHistory.forEach((history, index) => {
      const historyDate = formatDate(history.timestamp);
      modalContent += `
        <div style="margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600; color:#374151;">${history.status}</div>
          <div style="font-size:0.9em; color:#6b7280;">${history.note}</div>
          <div style="font-size:0.8em; color:#9ca3af;">${historyDate} - ${history.changedBy || 'Sistem'}</div>
        </div>
      `;
    });
    modalContent += `</div>`;
  }
  
  modalContent += `
    <p><strong>Silinen Kişi:</strong> <span class="deleted-by">${record.deletedBy ? escapeHtml(record.deletedBy) : 'Bilinmiyor'}</span></p>
    <p><strong>Silinen Panel:</strong> <span class="deleted-from">${record.deletedFrom ? escapeHtml(record.deletedFrom) : ''}</span></p>
  `;
  
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

function shorten(text, maxLen) {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/, function(m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
}

function changeStatus(id, newStatus) {
  let records = getRecords();
  const record = records.find(r => r.id === id);
  if (record) {
    const oldStatus = record.status;
    record.status = newStatus;
    
    // İşlem geçmişi ekle
    if (!record.processHistory) {
      record.processHistory = [];
    }
    
    let note = '';
    switch(newStatus) {
      case 'Onaylandı':
        note = 'Yönetici tarafından onaylandı';
        break;
      case 'İletildi':
        note = 'İlgili birime iletildi';
        break;
      case 'İşleniyor':
        note = 'İşlem başlatıldı';
        break;
      case 'Tamamlandı':
        note = 'İşlem tamamlandı';
        break;
      default:
        note = `Durum "${newStatus}" olarak güncellendi`;
    }
    
    record.processHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note,
      changedBy: 'Yönetici'
    });
    
    saveRecords(records);
    
    // Listeyi hemen güncelle
    renderAdminList();
    
    // Başarı mesajı göster
    showStatusUpdateMessage(newStatus);
  }
}

// Durum güncelleme mesajı
function showStatusUpdateMessage(newStatus) {
  // Geçici bir mesaj göster
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    animation: slideIn 0.3s ease;
  `;
  message.textContent = `Durum "${newStatus}" olarak güncellendi`;
  
  // CSS animasyonu
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(message);
  
  // 3 saniye sonra kaldır
  setTimeout(() => {
    message.style.animation = 'slideOut 0.3s ease';
    message.style.transform = 'translateX(100%)';
    message.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(message);
    }, 300);
  }, 3000);
}

// Canlı güncelleme fonksiyonu
function startPolling() {
  lastRecordTime = parseInt(localStorage.getItem(NEW_RECORD_KEY) || '0', 10);
  lastRecordCount = getRecords().length;
  
  // İlk kontrol
  checkForNewRecord();
  
  pollInterval = setInterval(() => {
    const currentRecords = getRecords();
    const currentCount = currentRecords.length;
    const currentTime = parseInt(localStorage.getItem(NEW_RECORD_KEY) || '0', 10);
    
    // Yeni kayıt kontrolü
    if (currentTime > lastRecordTime) {
      showAdminAlert();
      lastRecordTime = currentTime;
      renderAdminList(); // Listeyi güncelle
    }
    
    // Kayıt sayısı değişikliği kontrolü
    if (currentCount !== lastRecordCount) {
      renderAdminList();
      lastRecordCount = currentCount;
    }
  }, 1000); // 1 saniyede bir kontrol et (daha hızlı)
}

// localStorage değişikliklerini dinle
window.addEventListener('storage', function(e) {
  if (e.key === 'faultRecords') {
    // Kayıtlar değiştiğinde listeyi güncelle
    renderAdminList();
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
        renderAdminList();
      }, 100);
    }
  };
}

// Storage listener'ı başlat
setupStorageListener();

function showAdminAlert() {
  const adminAlert = document.getElementById('adminAlert');
  
  if (adminAlert) {
    adminAlert.style.display = 'block';
    adminAlert.classList.remove('shake');
    void adminAlert.offsetWidth; // Reflow
    adminAlert.classList.add('shake');
    
    setTimeout(() => {
      adminAlert.style.display = 'none';
    }, 4000);
  }
  
  // Ses çal
  playNotificationSound();
}

// Alternatif ses çalma fonksiyonu
function playNotificationSound() {
  try {
    // Web Audio API kullanarak basit bir bip sesi oluştur
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.warn('Ses çalınamadı:', error);
  }
}

function checkForNewRecord() {
  const lastSeen = parseInt(sessionStorage.getItem('adminLastSeen') || '0', 10);
  const lastRecord = parseInt(localStorage.getItem(NEW_RECORD_KEY) || '0', 10);
  if (lastRecord > lastSeen) {
    showAdminAlert();
    sessionStorage.setItem('adminLastSeen', lastRecord.toString());
  }
}

// Excel Export Modal İşlevleri
const excelModal = document.getElementById('excelModal');
const excelModalClose = document.getElementById('excelModalClose');
const excelModalExportBtn = document.getElementById('excelModalExportBtn');
const excelModalCancelBtn = document.getElementById('excelModalCancelBtn');
const includeDeletedExcel = document.getElementById('includeDeletedExcel');

// Excel Export butonu
document.getElementById('exportBtn').addEventListener('click', function() {
  excelModal.classList.add('active');
});

// Modal kapatma
excelModalClose.addEventListener('click', function() {
  excelModal.classList.remove('active');
});

excelModalCancelBtn.addEventListener('click', function() {
  excelModal.classList.remove('active');
});

excelModal.addEventListener('click', function(e) {
  if (e.target === excelModal) {
    excelModal.classList.remove('active');
  }
});

// Excel Export işlemi
excelModalExportBtn.addEventListener('click', function() {
  try {
    let records = getRecords();
    
    // Filtreleme uygula
    if (currentFilter === 'ariza') {
      records = records.filter(record => record.requestType === 'ariza');
    } else if (currentFilter === 'malzeme') {
      records = records.filter(record => record.requestType === 'malzeme');
    }
    
    // Geçersiz kayıtları filtrele
    records = records.filter(record => {
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
    
    // Silinen kayıtları dahil et
    if (includeDeletedExcel.checked) {
      const deletedRecords = JSON.parse(localStorage.getItem('deletedFaultRecords') || '[]');
      records = [...records, ...deletedRecords];
    }
    
    if (records.length === 0) {
      alert('Dışa aktarılacak veri yok!');
      return;
    }
    
    // Excel verisi hazırla
    const wsData = [
      ['IP Numarası','İsim Soyisim','Talep Türü','Cihaz/Malzeme/Başlık','Detay','Çözüm/Miktar','Durum','Tarih/Saat','Silinen Kişi','Silinen Panel'],
      ...records.map(r => [
        String(r.ip||''),
        String(r.fullname||''),
        r.requestType === 'ariza' ? 'Arıza Talebi' : r.requestType === 'malzeme' ? 'Malzeme Talebi' : r.requestType === 'diger' ? 'Diğer Talebi' : 'Talep',
        r.requestType === 'ariza' ? String(r.deviceName||'') : r.requestType === 'malzeme' ? String(r.materialType||'') : String(r.otherTitle||''),
        r.requestType === 'ariza' ? String(r.faultDesc||'') : r.requestType === 'malzeme' ? String(r.materialDesc||'') : String(r.otherDesc||''),
        r.requestType === 'ariza' ? String(r.solution||'') : r.requestType === 'malzeme' ? String(r.quantity||'') + ' adet' : String(r.otherDesc||''),
        String(r.status||''),
        formatDate(r.timestamp),
        r.deletedBy||'',
        r.deletedFrom||''
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TalepKayitlari');
    
    // Dosya adı oluştur
    const now = new Date();
    const fileName = `talep_kayitlari_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    excelModal.classList.remove('active');
    
    // Başarı mesajı
    alert(`${records.length} kayıt başarıyla dışa aktarıldı!`);
    
  } catch (error) {
    console.error('Excel export hatası:', error);
    alert('Excel dosyası oluşturulurken bir hata oluştu!');
  }
});

// ESC tuşu ile modal kapatma
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (excelModal.classList.contains('active')) {
      excelModal.classList.remove('active');
    }
    if (modal.classList.contains('active')) {
      closeModal();
    }
  }
}); 