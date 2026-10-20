# İstanbul Cevahir AVM İnteraktif Harita & Navigasyon

İstanbul Cevahir AVM için geliştirilmiş interaktif vektörel kat planı, canlı navigasyon (Dijkstra algoritması), mağaza arama, indirim/kampanya rehberi ve simülasyon motoru.

## 🚀 Özellikler

- **Kat Planları (1 - 6. Kat):** Cevahir AVM'nin gerçek mimari vektörel SVG kat planları
- **Mağaza Konumlandırması:** 217+ mağaza kendi mimari poligonlarının tam merkezinde marka logolarıyla yer alır
- **Rota Bulma & Navigasyon:** 
  - Yürüyen merdiven ve asansör rotalama tercihleri
  - 4 katmanlı neon rota gösterimi ve kat geçiş butonları ("Hop" animasyonları)
  - Alışveriş çantası maskotu ile adım adım canlı simülasyon
- **GPS & Canlı Konum:** Cevahir ana kapıları ve metro girişlerinden hızlı başlama
- **İndirim & Kampanyalar:** Mağazaya özel kupon kodları ve anlık indirim popup'ları
- **Kullanıcı Dostu Arayüz:** Aydınlık/Karanlık mod desteği, akıllı arama ve kategori filtreleme

## 📦 Git & GitHub Bağlantısı

Projeyi Git'e eklemek ve GitHub'a yüklemek için terminalde:

```bash
# Git deposunu başlat
git init

# Dosyaları ekle ve ilk commit'i yap
git add .
git commit -m "feat: Cevahir AVM interaktif harita ve navigasyon sistemi"

# GitHub deposuna bağla (kendi deponuzun linkini ekleyin)
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/cevahir-avm-navigasyon.git
git push -u origin main
```

## 🔥 Firebase Hosting ile Canlıya Alma

Projeyi Firebase Hosting üzerinden ücretsiz yayınlamak için:

```bash
# 1. Firebase CLI kurulu değilse kurun:
npm install -g firebase-tools

# 2. Firebase hesabınıza giriş yapın:
firebase login

# 3. Projenizi Firebase'e bağlayın:
firebase use --add
# (veya mevcut projenizi seçin)

# 4. Canlıya yayınlayın:
firebase deploy --only hosting
```

Yayınlandıktan sonra size `https://<proje-adiniz>.web.app` şeklinde ücretsiz SSL sertifikalı canlı bir web linki verilecektir.
