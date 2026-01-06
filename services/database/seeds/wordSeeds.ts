import { Word, MODE_FLAGS, CATEGORIES, DIFFICULTIES } from '../types';

/**
 * Get initial seed data for the database
 * Contains words migrated from the old geminiservice.ts plus extended data
 */
export function getInitialSeedData(): Omit<Word, 'id'>[] {
    const words: Omit<Word, 'id'>[] = [];

    // Import all word pools
    words.push(...getClassicWords());
    words.push(...getSilentWords());
    words.push(...getMarathonWords());
    words.push(...getExtendedWords());

    console.log(`[Seed] Total words prepared: ${words.length}`);
    return words;
}

// Classic mode words (from original geminiservice.ts)
function getClassicWords(): Omit<Word, 'id'>[] {
    const classicPool = [
        { target: "FUTBOL", forbidden: ["Top", "Kale", "Gol", "Maç", "Takım"], cat: 1, diff: 1 },
        { target: "GÜNEŞ", forbidden: ["Sarı", "Sıcak", "Yaz", "Gökyüzü", "Yıldız"], cat: 2, diff: 1 },
        { target: "TELEFON", forbidden: ["Aramak", "Konuşmak", "Mobil", "Alo", "Akıllı"], cat: 5, diff: 1 },
        { target: "OKUL", forbidden: ["Öğrenci", "Öğretmen", "Ders", "Sınıf", "Okumak"], cat: 3, diff: 1 },
        { target: "DOKTOR", forbidden: ["Hasta", "Hastane", "İlaç", "Muayene", "Beyaz Önlük"], cat: 3, diff: 1 },
        { target: "PİZZA", forbidden: ["İtalyan", "Hamur", "Peynir", "Yuvarlak", "Dilim"], cat: 3, diff: 1 },
        { target: "KEDİ", forbidden: ["Miyav", "Tüy", "Pati", "Köpek", "Evcil"], cat: 3, diff: 1 },
        { target: "DENİZ", forbidden: ["Su", "Mavi", "Yüzmek", "Balık", "Tuzlu"], cat: 3, diff: 1 },
        { target: "KİTAP", forbidden: ["Okumak", "Sayfa", "Yazar", "Roman", "Kütüphane"], cat: 4, diff: 1 },
        { target: "UÇAK", forbidden: ["Havalimanı", "Pilot", "Kanat", "Uçmak", "Yolcu"], cat: 5, diff: 1 },
        { target: "KAHVE", forbidden: ["İçmek", "Sıcak", "Kafein", "Fincan", "Türk"], cat: 3, diff: 1 },
        { target: "AYNA", forbidden: ["Bakmak", "Yansıma", "Cam", "Görmek", "Kendin"], cat: 3, diff: 1 },
        { target: "GÖZLÜK", forbidden: ["Göz", "Görmek", "Çerçeve", "Cam", "Takmak"], cat: 3, diff: 1 },
        { target: "SAAT", forbidden: ["Zaman", "Dakika", "Kol", "Duvar", "Geç"], cat: 3, diff: 1 },
        { target: "ÇİKOLATA", forbidden: ["Tatlı", "Kakaolu", "Şeker", "Yemek", "Bitter"], cat: 3, diff: 1 },
        { target: "İSTANBUL", forbidden: ["Boğaz", "Şehir", "Türkiye", "Köprü", "Deniz"], cat: 4, diff: 1 },
        { target: "ATATÜRK", forbidden: ["Lider", "Kurucu", "Türkiye", "Cumhuriyet", "Mustafa"], cat: 4, diff: 1 },
        { target: "BAYRAK", forbidden: ["Kırmızı", "Ay", "Yıldız", "Ülke", "Dalgalanmak"], cat: 4, diff: 1 },
        { target: "SİNEMA", forbidden: ["Film", "İzlemek", "Salon", "Patlamış Mısır", "Perde"], cat: 1, diff: 1 },
        { target: "BİLGİSAYAR", forbidden: ["Ekran", "Klavye", "Mouse", "İnternet", "Oyun"], cat: 5, diff: 1 },
        { target: "DONDURMA", forbidden: ["Yaz", "Soğuk", "Külah", "Yalamak", "Maraş"], cat: 3, diff: 1 },
        { target: "GÖKKUŞAĞI", forbidden: ["Renk", "Yağmur", "Güneş", "Gökyüzü", "Yedi"], cat: 2, diff: 1 },
        { target: "ASLAN", forbidden: ["Orman", "Kral", "Kükremek", "Yele", "Hayvan"], cat: 2, diff: 1 },
        { target: "TREN", forbidden: ["Ray", "Vagon", "Demiryolu", "İstasyon", "Hızlı"], cat: 5, diff: 1 },
        { target: "YAPAY ZEKA", forbidden: ["Robot", "Bilgisayar", "Akıl", "Teknoloji", "Gelecek"], cat: 5, diff: 3 },
        { target: "METAVERSE", forbidden: ["Sanal", "Evren", "Gözlük", "Facebook", "Oyun"], cat: 5, diff: 4 },
        { target: "KRİPTO PARA", forbidden: ["Bitcoin", "Borsa", "Sanal", "Yatırım", "Blockchain"], cat: 5, diff: 3 },
        { target: "NFT", forbidden: ["Resim", "Dijital", "Sanat", "Satmak", "Token"], cat: 5, diff: 4 },
        { target: "DRONE", forbidden: ["Uçmak", "Kamera", "Uzaktan", "Kumanda", "Hava"], cat: 5, diff: 2 },
        { target: "INFLUENCER", forbidden: ["Sosyal Medya", "Takipçi", "Ünlü", "Instagram", "Reklam"], cat: 5, diff: 2 },
        { target: "SELFIE", forbidden: ["Fotoğraf", "Çekmek", "Özçekim", "Telefon", "Kamera"], cat: 5, diff: 1 },
        { target: "PODCAST", forbidden: ["Dinlemek", "Radyo", "Ses", "Program", "Yayın"], cat: 5, diff: 2 },
        { target: "PARADOKS", forbidden: ["Çelişki", "Mantık", "Döngü", "İmkansız", "Zaman"], cat: 2, diff: 4 },
        { target: "DEJAVU", forbidden: ["An", "Yaşamak", "Tekrar", "His", "Görmek"], cat: 2, diff: 3 },
        { target: "NOSTALJİ", forbidden: ["Geçmiş", "Özlem", "Eski", "Hatıra", "Mazi"], cat: 4, diff: 2 },
        { target: "EMPATİ", forbidden: ["Kendini", "Yerine", "Koymak", "Hissetmek", "Anlamak"], cat: 2, diff: 2 },
        { target: "KAOS", forbidden: ["Karmaşa", "Düzen", "Kargaşa", "Teori", "Karışık"], cat: 2, diff: 3 },
        { target: "KUANTUM", forbidden: ["Fizik", "Atom", "Mekanik", "Küçük", "Enerji"], cat: 2, diff: 4 },
        { target: "EVRİM", forbidden: ["Darwin", "Maymun", "Değişim", "Biyoloji", "Tür"], cat: 2, diff: 3 },
        { target: "YERÇEKİMİ", forbidden: ["Newton", "Elma", "Düşmek", "Uzay", "Dünya"], cat: 2, diff: 2 },
        { target: "DEMOKRASİ", forbidden: ["Halk", "Seçim", "Oy", "Yönetim", "Sandık"], cat: 4, diff: 2 },
        { target: "ADALET", forbidden: ["Mahkeme", "Terazi", "Hukuk", "Hakim", "Eşitlik"], cat: 4, diff: 2 },
        { target: "KÜRESEL ISINMA", forbidden: ["İklim", "Sıcak", "Buzul", "Dünya", "Erimek"], cat: 2, diff: 3 },
        { target: "GERİ DÖNÜŞÜM", forbidden: ["Çöp", "Plastik", "Kağıt", "Kutu", "Tekrar"], cat: 3, diff: 2 },
        { target: "MİTOLOJİ", forbidden: ["Tanrı", "Efsane", "Yunan", "Zeus", "Hikaye"], cat: 4, diff: 3 },
        { target: "ÖZGÜRLÜK", forbidden: ["Hür", "Bağımsız", "Kuş", "Hapis", "İrade"], cat: 4, diff: 2 },
        { target: "CESARET", forbidden: ["Korkmamak", "Yürek", "Kahraman", "Atılmak", "Güç"], cat: 4, diff: 2 },
        { target: "VİCDAN", forbidden: ["İç Ses", "Ahlak", "Rahat", "Azap", "İyi"], cat: 4, diff: 3 },
    ];

    return classicPool.map(w => ({
        target: w.target,
        forbidden: w.forbidden,
        categoryId: w.cat,
        difficultyId: w.diff,
        modeFlags: MODE_FLAGS.CLASSIC | MODE_FLAGS.JOURNEY
    }));
}

// Silent mode words
function getSilentWords(): Omit<Word, 'id'>[] {
    const silentPool = [
        "Diş Fırçası", "Direksiyon", "Ütü", "Olta", "Yastık", "Kitap", "Telefon", "Havlu",
        "Kaşık", "Bardak", "Ayakkabı", "Gözlük", "Gitar", "Davul", "Piyano", "Tarak",
        "Süpürge", "Tencere", "İp", "Bisiklet", "Top", "Raket", "Balon", "Dondurma",
        "Uçurtma", "Kalem", "Fırça", "Mikrofon", "Balta", "Kibrit", "Çadır", "Balık",
        "Maymun", "Kuş", "Tavşan", "Robot", "Zombi", "Hayalet", "Uçak", "Helikopter",
        "Saat", "Şemsiye", "Kardan Adam", "Kayak", "Paten", "Paraşüt", "Mangal", "Mum",
        "Kravat", "Yüzük", "Parfüm", "Şapka", "Eldiven", "Mont", "Terlik", "Anahtar",
        "Televizyon", "Bilgisayar", "Kulaklık", "Cüzdan", "Otobüs", "Dürbün", "Harita",
        "Merdiven", "Asansör", "Maske", "Düdük", "Madalya", "Çekiç", "Testere", "Biberon",
        "Selfie Çekmek", "Yoga Yapmak", "Bowling Oynamak", "Balık Tutmak", "Ateş Yakmak",
        "Ameliyat Yapmak", "Pankek Çevirmek", "Bulaşık Yıkamak", "Bebek Uyutmak",
        "Saç Taramak", "Makyaj Yapmak", "Kravat Bağlamak", "Hapşırmak", "Esnemek",
        "Koşmak", "Yüzmek", "Tırmanmak", "Uyumak", "Alkışlamak", "Sarılmak", "Dans Etmek"
    ];

    return silentPool.map(target => ({
        target,
        forbidden: ["KONUŞMAK YASAK!", "SES ÇIKARMAK YASAK!"],
        categoryId: CATEGORIES.MIXED,
        difficultyId: DIFFICULTIES.MEDIUM,
        modeFlags: MODE_FLAGS.SILENT | MODE_FLAGS.JOURNEY
    }));
}

// Marathon mode words
function getMarathonWords(): Omit<Word, 'id'>[] {
    const marathonPool = [
        "Masa", "Sandalye", "Kalem", "Kağıt", "Kitap", "Çanta", "Ayakkabı", "Gömlek",
        "Şapka", "Gözlük", "Saat", "Telefon", "Bilgisayar", "Lamba", "Pil", "Televizyon",
        "Buzdolabı", "Ocak", "Tencere", "Çatal", "Kaşık", "Bardak", "Şişe", "Süpürge",
        "Sabun", "Havlu", "Ayna", "Kapı", "Pencere", "Halı", "Yatak", "Anahtar", "Para",
        "Bilet", "Makas", "Cetvel", "Harita", "Kemer", "Yüzük", "Kolye", "Şemsiye",
        "Top", "Balon", "Araba", "Tren", "Uçak", "Bisiklet", "Kedi", "Köpek", "Kuş",
        "Balık", "At", "İnek", "Tavuk", "Ağaç", "Çiçek", "Yaprak", "Taş", "Dağ", "Deniz",
        "Nehir", "Göl", "Bulut", "Yıldız", "Ay", "Güneş", "Yağmur", "Kar", "Rüzgar",
        "Ateş", "Ev", "Okul", "Hastane", "Market", "Park", "Yol", "Köprü", "Müze",
        "Doktor", "Öğretmen", "Polis", "Aşçı", "Şarkıcı", "Ressam", "Futbol", "Basketbol",
        "Pizza", "Hamburger", "Çikolata", "Dondurma", "Kahve", "Çay", "Ekmek", "Peynir"
    ];

    return marathonPool.map(target => ({
        target,
        forbidden: ["Hızlı Ol!", "Kelime Say!", "Odaklan!", "Pas Geçme!", "Yasaklı Yok!"],
        categoryId: CATEGORIES.MIXED,
        difficultyId: DIFFICULTIES.EASY,
        modeFlags: MODE_FLAGS.MARATHON | MODE_FLAGS.JOURNEY
    }));
}

// Extended words to reach 30,000 target
function getExtendedWords(): Omit<Word, 'id'>[] {
    const words: Omit<Word, 'id'>[] = [];

    // Entertainment category
    const entertainment = [
        { t: "NETFLIX", f: ["Dizi", "Film", "Platform", "İzlemek", "Abone"], d: 1 },
        { t: "SPOTIFY", f: ["Müzik", "Playlist", "Dinlemek", "App", "Podcast"], d: 1 },
        { t: "YOUTUBE", f: ["Video", "Kanal", "Abone", "İzlemek", "Yayıncı"], d: 1 },
        { t: "TİKTOK", f: ["Video", "Dans", "Trend", "Kısa", "Sosyal"], d: 1 },
        { t: "INSTAGRAM", f: ["Fotoğraf", "Story", "Takipçi", "Beğeni", "Paylaşım"], d: 1 },
        { t: "TWITTER", f: ["Tweet", "Mesaj", "Takip", "Gündem", "Paylaş"], d: 1 },
        { t: "OSCAR", f: ["Ödül", "Film", "Sinema", "Heykel", "Hollywood"], d: 2 },
        { t: "GRAMMY", f: ["Müzik", "Ödül", "Şarkıcı", "Tören", "Amerika"], d: 3 },
        { t: "EUROVISION", f: ["Şarkı", "Yarışma", "Avrupa", "Puan", "Ülke"], d: 2 },
        { t: "FORMULA 1", f: ["Yarış", "Araba", "Hız", "Pilot", "Pist"], d: 2 },
        { t: "OLİMPİYAT", f: ["Spor", "Madalya", "Ülke", "Yarışma", "Bayrak"], d: 1 },
        { t: "FIFA", f: ["Futbol", "Dünya", "Kupası", "Maç", "Organizasyon"], d: 2 },
        { t: "NBA", f: ["Basketbol", "Amerika", "Lig", "Maç", "Takım"], d: 2 },
        { t: "ŞANPIYONLAR LİGİ", f: ["Futbol", "Avrupa", "Takım", "Final", "Kupa"], d: 2 },
        { t: "SUPER BOWL", f: ["Amerikan", "Futbol", "Final", "Gösteri", "Amerika"], d: 3 },
    ];

    // Science category
    const science = [
        { t: "DNA", f: ["Gen", "Hücre", "Sarmal", "Kalıtım", "Biyoloji"], d: 2 },
        { t: "ATOM", f: ["Küçük", "Parçacık", "Çekirdek", "Elektron", "Madde"], d: 2 },
        { t: "GALAKSI", f: ["Yıldız", "Uzay", "Samanyolu", "Gezegen", "Evren"], d: 2 },
        { t: "KARADELIK", f: ["Uzay", "Çekim", "Işık", "Yutmak", "Yıldız"], d: 3 },
        { t: "ROBOTİK", f: ["Makine", "Otomasyon", "Yapay", "Hareket", "Programlama"], d: 2 },
        { t: "NÖROBİLİM", f: ["Beyin", "Sinir", "Araştırma", "Bilim", "Düşünce"], d: 4 },
        { t: "GENETİK", f: ["DNA", "Kalıtım", "Hastalık", "Bilim", "Miras"], d: 3 },
        { t: "EKOSİSTEM", f: ["Doğa", "Canlı", "Denge", "Çevre", "Yaşam"], d: 2 },
        { t: "FOSİL", f: ["Eski", "Kemik", "Dinozor", "Kazı", "Tarih"], d: 2 },
        { t: "HÜCRE", f: ["Canlı", "Küçük", "Bölünme", "Biyoloji", "Yapı"], d: 2 },
    ];

    // Daily Life category
    const dailyLife = [
        { t: "KAHVALTI", f: ["Sabah", "Yemek", "Yumurta", "Çay", "Sofra"], d: 1 },
        { t: "ALIŞVERİŞ", f: ["Market", "Para", "Satın", "Sepet", "Mağaza"], d: 1 },
        { t: "TEMİZLİK", f: ["Ev", "Süpürge", "Silmek", "Deterjan", "Düzen"], d: 1 },
        { t: "YEMEK YAPMAK", f: ["Mutfak", "Pişirmek", "Tarif", "Malzeme", "Tencere"], d: 1 },
        { t: "UYUMAK", f: ["Gece", "Yatak", "Uyku", "Rüya", "Dinlenmek"], d: 1 },
        { t: "SPOR YAPMAK", f: ["Egzersiz", "Koşu", "Sağlık", "Hareket", "Salon"], d: 1 },
        { t: "TRAFIKTE KALMAK", f: ["Araba", "Yol", "Sıkışık", "Beklemek", "Korna"], d: 1 },
        { t: "DOĞUM GÜNÜ", f: ["Pasta", "Mum", "Kutlama", "Hediye", "Parti"], d: 1 },
        { t: "DÜĞÜN", f: ["Evlilik", "Gelin", "Damat", "Tören", "Davet"], d: 1 },
        { t: "BAYRAM", f: ["Tatil", "Aile", "Ziyaret", "Şeker", "Kutlama"], d: 1 },
    ];

    // Technology category
    const technology = [
        { t: "5G", f: ["İnternet", "Hız", "Mobil", "Ağ", "Gelecek"], d: 2 },
        { t: "BLOCKCHAIN", f: ["Kripto", "Zincir", "Güvenlik", "Dijital", "Kayıt"], d: 3 },
        { t: "CLOUD", f: ["Bulut", "Depolama", "İnternet", "Veri", "Sunucu"], d: 2 },
        { t: "HACKER", f: ["Bilgisayar", "Güvenlik", "Saldırı", "Kod", "Şifre"], d: 2 },
        { t: "VPN", f: ["Gizlilik", "İnternet", "Bağlantı", "Güvenlik", "IP"], d: 3 },
        { t: "CHATGPT", f: ["Yapay", "Zeka", "Sohbet", "Robot", "Yazı"], d: 2 },
        { t: "TESLA", f: ["Elektrik", "Araba", "Musk", "Otonom", "Batarya"], d: 2 },
        { t: "SPACEX", f: ["Roket", "Uzay", "Musk", "Fırlatma", "Mars"], d: 2 },
        { t: "APPLE", f: ["iPhone", "Marka", "Elma", "Teknoloji", "Mac"], d: 1 },
        { t: "GOOGLE", f: ["Arama", "İnternet", "Android", "Motor", "Şirket"], d: 1 },
    ];

    // Culture category
    const culture = [
        { t: "RAMAZAN", f: ["Oruç", "İftar", "Sahur", "Bayram", "Ay"], d: 1 },
        { t: "KURBAN", f: ["Bayram", "Hayvan", "İslam", "Kesim", "Dini"], d: 1 },
        { t: "NOEL", f: ["Yılbaşı", "Ağaç", "Hediye", "Baba", "Aralık"], d: 1 },
        { t: "HALLOWEEN", f: ["Balkabağı", "Korku", "Kostüm", "Şeker", "Ekim"], d: 2 },
        { t: "SEVGILILER GÜNÜ", f: ["Aşk", "Şubat", "Hediye", "Kalp", "Çiçek"], d: 1 },
        { t: "ANNELER GÜNÜ", f: ["Anne", "Hediye", "Mayıs", "Çiçek", "Kutlama"], d: 1 },
        { t: "NEVRUz", f: ["Bahar", "Yeni", "Yıl", "Ateş", "Kutlama"], d: 2 },
        { t: "HIDIRELLEZ", f: ["Bahar", "Mayıs", "Dilek", "Gül", "Kutlama"], d: 3 },
        { t: "KARAGÖZ", f: ["Gölge", "Oyun", "Hacivat", "Perde", "Geleneksel"], d: 2 },
        { t: "EBRU", f: ["Sanat", "Su", "Boya", "Türk", "Desen"], d: 2 },
    ];

    // Map all to Word format
    const allCategories = [
        { data: entertainment, catId: CATEGORIES.ENTERTAINMENT },
        { data: science, catId: CATEGORIES.SCIENCE },
        { data: dailyLife, catId: CATEGORIES.DAILY_LIFE },
        { data: technology, catId: CATEGORIES.TECHNOLOGY },
        { data: culture, catId: CATEGORIES.CULTURE },
    ];

    for (const { data, catId } of allCategories) {
        for (const item of data) {
            words.push({
                target: item.t,
                forbidden: item.f,
                categoryId: catId,
                difficultyId: item.d,
                modeFlags: MODE_FLAGS.CLASSIC | MODE_FLAGS.JOURNEY
            });
        }
    }

    return words;
}
