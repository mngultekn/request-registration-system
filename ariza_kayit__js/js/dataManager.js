// Veri Yönetimi, Yedekleme ve Senkronizasyon Sistemi
class DataManager {
  constructor() {
    this.storageKey = 'faultRecords';
    this.backupKey = 'faultRecordsBackup';
    this.syncKey = 'lastSyncTime';
    this.versionKey = 'dataVersion';
    this.autoBackupInterval = null;
    this.syncInterval = null;
    this.init();
  }

  // Sistem başlatma
  init() {
    this.setupAutoBackup();
    this.setupAutoSync();
    this.checkDataIntegrity();
    this.migrateOldData();
  }

  // Veri alma
  getRecords() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return [];
      
      const records = JSON.parse(data);
      
      // Veri bütünlüğü kontrolü
      if (!Array.isArray(records)) {
        console.error('Veri formatı geçersiz, yedekten geri yükleniyor...');
        return this.restoreFromBackup();
      }
      
      return records.filter(record => this.validateRecord(record));
    } catch (error) {
      console.error('Veri okuma hatası:', error);
      return this.restoreFromBackup();
    }
  }

  // Veri kaydetme
  saveRecords(records) {
    try {
      // Veri bütünlüğü kontrolü
      if (!Array.isArray(records)) {
        throw new Error('Geçersiz veri formatı');
      }
      
      // Her kaydı validate et
      const validRecords = records.filter(record => this.validateRecord(record));
      
      // Versiyon numarasını artır
      const currentVersion = this.getDataVersion();
      const newVersion = currentVersion + 1;
      
      // Ana veriyi kaydet
      localStorage.setItem(this.storageKey, JSON.stringify(validRecords));
      localStorage.setItem(this.versionKey, newVersion.toString());
      
      // Otomatik yedekleme
      this.createBackup(validRecords);
      
      // Senkronizasyon zamanını güncelle
      this.updateSyncTime();
      
      return true;
    } catch (error) {
      console.error('Veri kaydetme hatası:', error);
      return false;
    }
  }

  // Kayıt ekleme
  addRecord(record) {
    try {
      const records = this.getRecords();
      
      // Yeni kayıt için ID oluştur
      record.id = this.generateUniqueId();
      record.timestamp = new Date().toISOString();
      record.version = this.getDataVersion() + 1;
      record.createdBy = this.getCurrentUser() || 'unknown';
      
      // Kaydı başa ekle
      records.unshift(record);
      
      // Kaydet
      if (this.saveRecords(records)) {
        // Başarılı ekleme sonrası işlemler
        this.notifyDataChange('add', record);
        return { success: true, record };
      } else {
        return { success: false, error: 'Veri kaydedilemedi' };
      }
    } catch (error) {
      console.error('Kayıt ekleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kayıt güncelleme
  updateRecord(id, updates) {
    try {
      const records = this.getRecords();
      const index = records.findIndex(r => r.id === id);
      
      if (index === -1) {
        return { success: false, error: 'Kayıt bulunamadı' };
      }
      
      // Güncelleme bilgilerini ekle
      updates.lastModified = new Date().toISOString();
      updates.modifiedBy = this.getCurrentUser() || 'unknown';
      updates.version = this.getDataVersion() + 1;
      
      // Kaydı güncelle
      records[index] = { ...records[index], ...updates };
      
      // Kaydet
      if (this.saveRecords(records)) {
        this.notifyDataChange('update', records[index]);
        return { success: true, record: records[index] };
      } else {
        return { success: false, error: 'Güncelleme kaydedilemedi' };
      }
    } catch (error) {
      console.error('Kayıt güncelleme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Kayıt silme
  deleteRecord(id) {
    try {
      const records = this.getRecords();
      const record = records.find(r => r.id === id);
      
      if (!record) {
        return { success: false, error: 'Kayıt bulunamadı' };
      }
      
      // Silinen kayıtları ayrı storage'a taşı
      this.moveToDeletedRecords(record);
      
      // Ana listeden kaldır
      const filteredRecords = records.filter(r => r.id !== id);
      
      // Kaydet
      if (this.saveRecords(filteredRecords)) {
        this.notifyDataChange('delete', record);
        return { success: true, record };
      } else {
        return { success: false, error: 'Silme işlemi kaydedilemedi' };
      }
    } catch (error) {
      console.error('Kayıt silme hatası:', error);
      return { success: false, error: error.message };
    }
  }

  // Otomatik yedekleme
  setupAutoBackup() {
    // Her 5 dakikada bir yedekleme
    this.autoBackupInterval = setInterval(() => {
      this.createBackup();
    }, 5 * 60 * 1000);
  }

  // Yedek oluşturma
  createBackup(records = null) {
    try {
      const dataToBackup = records || this.getRecords();
      const backup = {
        data: dataToBackup,
        timestamp: new Date().toISOString(),
        version: this.getDataVersion(),
        user: this.getCurrentUser() || 'system'
      };
      
      localStorage.setItem(this.backupKey, JSON.stringify(backup));
      
      // Eski yedekleri temizle (son 10 yedeği tut)
      this.cleanupOldBackups();
      
      console.log('Yedekleme oluşturuldu:', backup.timestamp);
    } catch (error) {
      console.error('Yedekleme hatası:', error);
    }
  }

  // Yedekten geri yükleme
  restoreFromBackup() {
    try {
      const backupData = localStorage.getItem(this.backupKey);
      if (!backupData) {
        console.warn('Yedek bulunamadı, boş liste döndürülüyor');
        return [];
      }
      
      const backup = JSON.parse(backupData);
      console.log('Yedekten geri yükleniyor:', backup.timestamp);
      
      // Ana veriyi geri yükle
      localStorage.setItem(this.storageKey, JSON.stringify(backup.data));
      localStorage.setItem(this.versionKey, backup.version.toString());
      
      return backup.data;
    } catch (error) {
      console.error('Yedekten geri yükleme hatası:', error);
      return [];
    }
  }

  // Eski yedekleri temizleme
  cleanupOldBackups() {
    try {
      const backupKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('faultRecordsBackup_')
      );
      
      if (backupKeys.length > 10) {
        // En eski yedekleri sil
        backupKeys.sort().slice(0, backupKeys.length - 10).forEach(key => {
          localStorage.removeItem(key);
        });
      }
    } catch (error) {
      console.error('Yedek temizleme hatası:', error);
    }
  }

  // Otomatik senkronizasyon
  setupAutoSync() {
    // Her 30 saniyede bir senkronizasyon kontrolü
    this.syncInterval = setInterval(() => {
      this.checkForUpdates();
    }, 30000);
  }

  // Güncelleme kontrolü
  checkForUpdates() {
    try {
      const lastSync = this.getLastSyncTime();
      const currentTime = Date.now();
      
      // 5 dakikadan eski senkronizasyon varsa güncelle
      if (currentTime - lastSync > 5 * 60 * 1000) {
        this.syncData();
      }
    } catch (error) {
      console.error('Güncelleme kontrolü hatası:', error);
    }
  }

  // Veri senkronizasyonu
  syncData() {
    try {
      // Gerçek uygulamada backend API'ye istek atılır
      console.log('Veri senkronizasyonu başlatıldı');
      
      // Senkronizasyon zamanını güncelle
      this.updateSyncTime();
      
      // Storage event'ini tetikle (diğer sekmeler için)
      this.triggerStorageEvent();
    } catch (error) {
      console.error('Senkronizasyon hatası:', error);
    }
  }

  // Veri bütünlüğü kontrolü
  checkDataIntegrity() {
    try {
      const records = this.getRecords();
      let hasIssues = false;
      
      records.forEach((record, index) => {
        if (!this.validateRecord(record)) {
          console.warn('Geçersiz kayıt bulundu:', record);
          hasIssues = true;
        }
      });
      
      if (hasIssues) {
        console.log('Veri bütünlüğü sorunları tespit edildi, düzeltiliyor...');
        this.repairData();
      }
    } catch (error) {
      console.error('Veri bütünlüğü kontrolü hatası:', error);
    }
  }

  // Veri onarımı
  repairData() {
    try {
      const records = this.getRecords();
      const validRecords = records.filter(record => this.validateRecord(record));
      
      if (validRecords.length !== records.length) {
        console.log(`${records.length - validRecords.length} geçersiz kayıt temizlendi`);
        this.saveRecords(validRecords);
      }
    } catch (error) {
      console.error('Veri onarımı hatası:', error);
    }
  }

  // Eski veri migrasyonu
  migrateOldData() {
    try {
      const records = this.getRecords();
      let needsMigration = false;
      
      records.forEach(record => {
        if (!record.requestType) {
          // Eski format kayıtları yeni formata çevir
          record.requestType = 'ariza';
          record.version = 1;
          needsMigration = true;
        }
      });
      
      if (needsMigration) {
        console.log('Eski veri formatı yeni formata çevriliyor...');
        this.saveRecords(records);
      }
    } catch (error) {
      console.error('Veri migrasyonu hatası:', error);
    }
  }

  // Kayıt validasyonu
  validateRecord(record) {
    if (!record || typeof record !== 'object') return false;
    if (!record.id || !record.ip || !record.fullname) return false;
    if (!record.timestamp) return false;
    
    // Talep türüne göre gerekli alanları kontrol et
    if (record.requestType === 'ariza') {
      if (!record.deviceName || !record.faultDesc) return false;
    } else if (record.requestType === 'malzeme') {
      if (!record.materialType || !record.materialDesc || !record.quantity) return false;
    } else if (record.requestType === 'diger') {
      if (!record.otherTitle || !record.otherDesc) return false;
    }
    
    return true;
  }

  // Benzersiz ID oluşturma
  generateUniqueId() {
    return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Veri versiyonu alma
  getDataVersion() {
    return parseInt(localStorage.getItem(this.versionKey) || '0');
  }

  // Senkronizasyon zamanı alma
  getLastSyncTime() {
    return parseInt(localStorage.getItem(this.syncKey) || '0');
  }

  // Senkronizasyon zamanını güncelleme
  updateSyncTime() {
    localStorage.setItem(this.syncKey, Date.now().toString());
  }

  // Mevcut kullanıcı bilgisi
  getCurrentUser() {
    if (window.authManager && window.authManager.currentUser) {
      return window.authManager.currentUser.username;
    }
    return null;
  }

  // Silinen kayıtları taşıma
  moveToDeletedRecords(record) {
    try {
      const deletedRecords = JSON.parse(localStorage.getItem('deletedFaultRecords') || '[]');
      
      record.deletedAt = new Date().toISOString();
      record.deletedBy = this.getCurrentUser() || 'unknown';
      record.deletedFrom = 'DataManager';
      
      deletedRecords.unshift(record);
      localStorage.setItem('deletedFaultRecords', JSON.stringify(deletedRecords));
    } catch (error) {
      console.error('Silinen kayıt taşıma hatası:', error);
    }
  }

  // Veri değişikliği bildirimi
  notifyDataChange(type, record) {
    // Custom event ile bildirim
    const event = new CustomEvent('dataChanged', {
      detail: { type, record, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  // Storage event tetikleme
  triggerStorageEvent() {
    // Diğer sekmeler için storage event tetikle
    const event = new StorageEvent('storage', {
      key: this.storageKey,
      newValue: localStorage.getItem(this.storageKey),
      oldValue: null,
      storageArea: localStorage
    });
    window.dispatchEvent(event);
  }

  // Sistem temizleme
  cleanup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  // Manuel yedekleme
  manualBackup() {
    this.createBackup();
    return { success: true, message: 'Manuel yedekleme tamamlandı' };
  }

  // Manuel geri yükleme
  manualRestore() {
    const restoredData = this.restoreFromBackup();
    return { 
      success: true, 
      message: 'Manuel geri yükleme tamamlandı',
      recordCount: restoredData.length
    };
  }

  // Veri istatistikleri
  getDataStats() {
    const records = this.getRecords();
    const deletedRecords = JSON.parse(localStorage.getItem('deletedFaultRecords') || '[]');
    
    return {
      totalRecords: records.length,
      deletedRecords: deletedRecords.length,
      lastBackup: localStorage.getItem(this.backupKey) ? 
        JSON.parse(localStorage.getItem(this.backupKey)).timestamp : null,
      lastSync: this.getLastSyncTime(),
      dataVersion: this.getDataVersion(),
      storageSize: this.getStorageSize()
    };
  }

  // Storage boyutu hesaplama
  getStorageSize() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? new Blob([data]).size : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Global data manager instance
window.dataManager = new DataManager();

// Sayfa kapanırken temizlik
window.addEventListener('beforeunload', () => {
  if (window.dataManager) {
    window.dataManager.cleanup();
  }
});
