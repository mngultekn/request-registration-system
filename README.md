# Talep Kayıt Sistemi

Bu proje, kurumsal talep ve arıza kayıtlarını yönetmek için geliştirilmiş modern bir web uygulamasıdır. Kullanıcılar arıza bildirimi, malzeme talebi ve diğer talepleri kolayca oluşturabilir, yöneticiler ise bu talepleri yönetebilir.

## 🚀 Özellikler

### Kullanıcı Özellikleri
- **Arıza Bildirimi**: Cihaz arızalarını detaylı şekilde bildirme
- **Malzeme Talebi**: Gerekli malzemeleri miktar ve açıklama ile talep etme
- **Diğer Talepler**: Genel talepleri öncelik seviyesi ile bildirme
- **Talep Takibi**: Gönderilen taleplerin durumunu görüntüleme
- **Arama ve Filtreleme**: Talepleri tür, durum ve tarihe göre filtreleme

### Yönetici Özellikleri
- **Talep Yönetimi**: Tüm talepleri görüntüleme ve yönetme
- **Durum Güncelleme**: Taleplerin durumunu değiştirme
- **Çözüm Ekleme**: Arıza taleplerine çözüm notları ekleme
- **Silinen Kayıtlar**: Silinen talepleri görüntüleme
- **Performans İstatistikleri**: Sistem kullanım verilerini analiz etme

## 🛠️ Teknolojiler

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Veri Saklama**: LocalStorage (tarayıcı tabanlı)
- **Responsive Design**: Mobil ve masaüstü uyumlu
- **Modern UI/UX**: Gradient butonlar, gölge efektleri, animasyonlar

## 📁 Proje Yapısı

```
ariza_kayit__js/
├── index.html          # Ana giriş sayfası
├── kullanici.html      # Kullanıcı arayüzü
├── yonetici.html       # Yönetici arayüzü
├── silinenler.html     # Silinen kayıtlar sayfası
├── css/
│   └── style.css      # Ana stil dosyası
├── js/
│   ├── app.js         # Ana uygulama mantığı
│   ├── auth.js        # Kimlik doğrulama
│   ├── dataManager.js # Veri yönetimi
│   ├── errorHandler.js # Hata yönetimi
│   ├── notificationManager.js # Bildirim yönetimi
│   ├── performanceManager.js # Performans izleme
│   ├── uiManager.js   # Kullanıcı arayüzü yönetimi
│   ├── userManager.js # Kullanıcı yönetimi
│   ├── validation.js  # Form doğrulama
│   └── yonetici.js    # Yönetici işlevleri
└── assets/            # Logo ve görseller
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Modern bir web tarayıcısı (Chrome, Firefox, Safari, Edge)
- Local web server (opsiyonel, geliştirme için)

### Kurulum Adımları
1. Projeyi bilgisayarınıza indirin
2. Proje klasörüne gidin
3. `index.html` dosyasını tarayıcınızda açın

### Geliştirme için Local Server
```bash
# Python ile (Python 3.x)
python -m http.server 8000

# Node.js ile (http-server paketi gerekli)
npx http-server

# PHP ile
php -S localhost:8000
```

## 📱 Kullanım

### Kullanıcı Girişi
1. Ana sayfada "Kullanıcı Girişi" butonuna tıklayın
2. Talep türünü seçin (Arıza, Malzeme, Diğer)
3. Gerekli bilgileri doldurun
4. Formu gönderin

### Yönetici Girişi
1. Ana sayfada "Yönetici Girişi" butonuna tıklayın
2. Tüm talepleri görüntüleyin
3. Talepleri düzenleyin veya durumlarını güncelleyin
4. Performans istatistiklerini inceleyin

## 🔧 Özelleştirme

### Yeni Talep Türü Ekleme
`js/app.js` dosyasında `requestTypeSelect` event listener'ına yeni tür ekleyebilirsiniz.

### Stil Değişiklikleri
`css/style.css` dosyasında renkler, boyutlar ve düzen ayarlarını değiştirebilirsiniz.

### Veri Yapısı
`js/dataManager.js` dosyasında veri saklama ve yönetim mantığını özelleştirebilirsiniz.

## 📊 Veri Yapısı

### Talep Kaydı
```javascript
{
  id: "unique_id",
  type: "ariza|malzeme|diger",
  fullname: "Kullanıcı Adı",
  ip: "IP Adresi",
  deviceName: "Cihaz Adı",
  faultDesc: "Arıza Açıklaması",
  solution: "Çözüm",
  materialType: "Malzeme Türü",
  materialDesc: "Malzeme Açıklaması",
  quantity: "Miktar",
  otherTitle: "Diğer Talep Başlığı",
  otherDesc: "Diğer Talep Açıklaması",
  priority: "Öncelik",
  status: "Durum",
  timestamp: "Oluşturulma Zamanı"
}
```

## 🐛 Bilinen Sorunlar

- Tarayıcı LocalStorage sınırlamaları (genellikle 5-10MB)
- Tarayıcı verileri temizlendiğinde kayıtlar kaybolur
- Çoklu kullanıcı desteği yoktur (local storage tabanlı)

## 🔮 Gelecek Özellikler

- [ ] Veritabanı entegrasyonu
- [ ] Çoklu kullanıcı desteği
- [ ] E-posta bildirimleri
- [ ] Dosya yükleme desteği
- [ ] API entegrasyonu
- [ ] Mobil uygulama

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Proje hakkında sorularınız için:
- GitHub Issues kullanın
- E-posta: mngultekn@gmail.com

## 🙏 Teşekkürler

Bu projeyi geliştirmek için kullanılan tüm açık kaynak kütüphanelere ve topluluğa teşekkürler.

---

**Not**: Bu sistem şu anda tarayıcı tabanlı LocalStorage kullanmaktadır. Üretim ortamında kullanmadan önce veritabanı entegrasyonu yapılması önerilir.
