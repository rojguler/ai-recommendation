# 🔐 CineSense - Giriş Yapma Kılavuzu

## 📋 ÖN HAZIRLIK

### 1. Backend'i Başlat
```bash
cd backend
npm install  # İlk kez çalıştırıyorsan
npm start    # veya npm run dev (otomatik yenileme için)
```

Backend `http://localhost:5000` adresinde çalışacak.

### 2. Frontend'i Başlat
Yeni bir terminal penceresi aç:
```bash
cd frontend
npm install  # İlk kez çalıştırıyorsan
npm start
```

Frontend `http://localhost:3000` adresinde açılacak.

---

## 🚀 GİRİŞ YAPMA YÖNTEMLERİ

### YÖNTEM 1: Yeni Hesap Oluşturma (Önerilen) ✅

1. Tarayıcıda `http://localhost:3000` adresine git
2. Ana sayfada **"Login"** butonuna tıkla veya direkt `/register` sayfasına git
3. **"Create one here"** veya **"Register here"** linkine tıkla
4. Kayıt formunu doldur:

   **Username:**
   - 3-20 karakter arası
   - Sadece harf, rakam ve alt çizgi (_) kullanılabilir
   - Örnek: `john_doe`, `user123`

   **Email:**
   - Geçerli bir email adresi
   - Örnek: `john@example.com`

   **Password:**
   - En az 8 karakter
   - En az 1 büyük harf (A-Z)
   - En az 1 küçük harf (a-z)
   - En az 1 rakam (0-9)
   - Örnek: `MyPass123`, `SecurePass1`

5. **"Register"** butonuna tıkla
6. Başarılı kayıt sonrası otomatik olarak giriş yapılır ve **Recommendations** sayfasına yönlendirilirsin

---

### YÖNTEM 2: Test Kullanıcısı ile Giriş (Hızlı Test) ⚡

Eğer hızlıca test etmek istiyorsan, önceden oluşturulmuş bir test kullanıcısı kullanabilirsin:

#### Test Kullanıcısı Oluşturma:

1. Backend dizininde terminal aç:
```bash
cd backend
npm run seed:user
```

Bu komut şu bilgilerle bir test kullanıcısı oluşturur:
- **Email:** `test@example.com`
- **Password:** `Test1234`
- **Username:** `testuser`

#### Test Kullanıcısı ile Giriş:

1. Tarayıcıda `http://localhost:3000` adresine git
2. **"Login"** sayfasına git
3. Şu bilgileri gir:
   - **Email:** `test@example.com`
   - **Password:** `Test1234`
4. **"Login"** butonuna tıkla
5. Başarılı giriş sonrası **Recommendations** sayfasına yönlendirilirsin

---

## ⚠️ SORUN GİDERME

### Backend Çalışmıyor?
- MySQL veritabanının çalıştığından emin ol
- `.env` dosyasının doğru yapılandırıldığından emin ol
- Port 5000'in kullanılabilir olduğundan emin ol

### Frontend Çalışmıyor?
- Port 3000'in kullanılabilir olduğundan emin ol
- `backend/.env` dosyasında `FRONTEND_URL=http://localhost:3000` olduğundan emin ol

### Giriş Yapamıyorum?
- Email ve şifrenin doğru olduğundan emin ol
- Şifre büyük/küçük harf duyarlıdır
- Eğer "User not found" hatası alıyorsan, önce kayıt ol
- Eğer "Invalid password" hatası alıyorsan, şifreni kontrol et

### "Cannot connect to server" Hatası?
- Backend'in çalıştığından emin ol (`http://localhost:5000`)
- Frontend'deki `.env` dosyasında `REACT_APP_API_URL=http://localhost:5000/api` olduğundan emin ol

---

## 📝 ÖNEMLİ NOTLAR

1. **İlk Kullanım:** İlk kez kullanıyorsan, önce **YÖNTEM 1** ile yeni hesap oluştur
2. **Test Kullanıcısı:** Test kullanıcısı zaten varsa, `npm run seed:user` komutu hata vermez, sadece bilgileri gösterir
3. **Şifre Gereksinimleri:** Şifre mutlaka büyük harf, küçük harf ve rakam içermelidir
4. **Token Süresi:** Giriş yaptıktan sonra token 7 gün geçerlidir

---

## 🎯 BAŞARILI GİRİŞ SONRASI

Giriş yaptıktan sonra şu özelliklere erişebilirsin:

- ✅ **Recommendations:** AI-powered film önerileri al
- ✅ **Profile:** Profilini düzenle, favori türleri seç
- ✅ **Favorites:** Favori filmlerini kaydet ve yönet
- ✅ **Search:** Film ara ve detaylarını görüntüle
- ✅ **Movie Details:** Film detay sayfalarını görüntüle

---

**İyi eğlenceler! 🎬**


