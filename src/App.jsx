import React, { useState, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import TakvimView from './TakvimView';
import ClientsView from './ClientsView';
import DigerView from './DigerView';
import ServicesView from './ServicesView';
import TrainersView from './TrainersView';
import IstatistikView from './IstatistikView';
import KarZararView from './KarZararView';
import GiderView from './GiderView';
import ProfilView from './ProfilView';
import RaporView from './RaporView';
import EgitmenKazancView from './EgitmenKazancView';

/* ============================================================================
   YARDIMCI
   ============================================================================ */
export const fmtTutar = (v) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0);

export const fmtTarihUzun = (iso) => {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
};

export const fmtTarih = (iso) => {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
};

export const saatDk = (saat) => {
  const [h, m] = saat.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const dkSaate = (dk) =>
  `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;

export const adSoyad = (obj) => {
  if (!obj) return '-';
  if (obj.adSoyad) return obj.adSoyad;
  return [obj.ad, obj.soyad].filter(Boolean).join(' ') || '-';
};

export const musteriBorc = (musteriId, randevular) =>
  randevular
    .filter((r) => r.musteriId === musteriId && r.durum !== 'iptal')
    .reduce((s, r) => s + r.toplamTutar - r.odenenTutar, 0);

export const bugun = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

/* ============================================================================
   ORTAK UI BILESENLER
   ============================================================================ */
export function NumericInput({ value, onChange, placeholder, className }) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      placeholder={placeholder}
      className={className || ''}
    />
  );
}

export function Button({ children, className, onClick, type, disabled }) {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-violet-600 text-white shadow shadow-violet-200 active:bg-violet-700 transition disabled:opacity-50 disabled:pointer-events-none ' +
        (className || '')
      }
    >
      {children}
    </button>
  );
}

export function ButtonOutline({ children, className, onClick, type, disabled }) {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      disabled={disabled}
      className={
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-violet-600 text-violet-600 bg-white shadow-sm active:bg-violet-50 transition disabled:opacity-50 disabled:pointer-events-none ' +
        (className || '')
      }
    >
      {children}
    </button>
  );
}

export function ModalShell({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {footer && (
          <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   SEED VERI
   ============================================================================ */
export const seedKullanicilar = [
  { id: 'k1', email: 'admin@studiog.com', adSoyad: 'Studio Admin', telefon: '05300000000', rol: 'admin' },
  { id: 'k2', email: 'egitmen@studiog.com', adSoyad: 'Demo Eğitmen', telefon: '05301111111', rol: 'egitmen' },
];

export const seedMusteriler = [
  { id: 'm1', ad: 'Ayşe', soyad: 'Demir', telefon: '05321111111', email: 'ayse@mail.com', createdAt: '2024-01-10' },
  { id: 'm2', ad: 'Mehmet', soyad: 'Kaya', telefon: '05322222222', email: 'mehmet@mail.com', createdAt: '2024-02-05' },
  { id: 'm3', ad: 'Zeynep', soyad: 'Arslan', telefon: '05323333333', email: 'zeynep@mail.com', createdAt: '2024-03-12' },
];

export const seedHizmetler = [
  { id: 'h1', ad: 'Pilates', fiyat: 350, sure: 40, aktif: true },
  { id: 'h2', ad: 'Yoga', fiyat: 300, sure: 50, aktif: true },
  { id: 'h3', ad: 'Personal Training', fiyat: 500, sure: 60, aktif: true },
  { id: 'h4', ad: 'Reformer', fiyat: 450, sure: 45, aktif: true },
];

export const seedEgitmenler = [
  { id: 'e1', ad: 'Demo', soyad: 'Eğitmen', telefon: '05301111111', email: 'egitmen@studiog.com', hizmetUcretleri: { h1: 200, h2: 180, h3: 300, h4: 250 } },
  { id: 'e2', ad: 'Seda', soyad: 'Yılmaz', telefon: '05302222222', email: 'seda@mail.com', hizmetUcretleri: { h1: 210, h2: 190, h3: 320, h4: 260 } },
];

export const seedRandevular = [
  { id: 'r1', grupId: 'g1', musteriId: 'm1', hizmetId: 'h1', egitmenId: 'e1', tarih: bugun, baslangic: '12:00', bitis: '12:40', sureDakika: 40, toplamTutar: 350, odenenTutar: 0, durum: 'beklemede', createdAt: bugun },
  { id: 'r2', grupId: 'g2', musteriId: 'm1', hizmetId: 'h2', egitmenId: 'e1', tarih: bugun, baslangic: '14:00', bitis: '14:50', sureDakika: 50, toplamTutar: 300, odenenTutar: 5000, durum: 'beklemede', createdAt: bugun },
  { id: 'r3', grupId: 'g3', musteriId: 'm2', hizmetId: 'h3', egitmenId: 'e2', tarih: bugun, baslangic: '10:00', bitis: '11:00', sureDakika: 60, toplamTutar: 500, odenenTutar: 500, durum: 'tamamlandi', createdAt: bugun },
  { id: 'r4', grupId: 'g4', musteriId: 'm3', hizmetId: 'h4', egitmenId: 'e1', tarih: bugun, baslangic: '16:00', bitis: '16:45', sureDakika: 45, toplamTutar: 450, odenenTutar: 0, durum: 'beklemede', createdAt: bugun },
];

/* ============================================================================
   APP - State koordinator
   ============================================================================ */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  /* ---- Data state ---- */
  const [musteriler, setMusteriler] = useState(seedMusteriler);
  const [hizmetler, setHizmetler] = useState(seedHizmetler);
  const [egitmenler, setEgitmenler] = useState(seedEgitmenler);
  const [randevular, setRandevular] = useState(seedRandevular);
  const [odemeler, setOdeme] = useState([]);
  const [kazanclar, setKazanc] = useState([]);
  const [giderler, setGider] = useState([]);

  /* ---- UI state ---- */
  const [activeScreen, setActiveScreen] = useState('takvim');
  const [selectedDate, setSelectedDate] = useState(bugun);

  const role = user?.rol || null;

  /* ---- Auth ---- */
  const handleLogin = useCallback(async (email, sifre) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre });
      if (data.user) {
        const md = data.user.user_metadata || {};
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          adSoyad: md.ad_soyad || email.split('@')[0],
          telefon: md.telefon,
          rol: md.rol || 'admin',
        });
        setLoggedIn(true);
        return true;
      }
      if (error) throw error;
    } catch {
      const u = seedKullanicilar.find((x) => x.email === email);
      if (u && sifre === '123456') {
        setUser(u);
        setLoggedIn(true);
        return true;
      }
    }
    return false;
  }, []);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null);
    setLoggedIn(false);
    setActiveScreen('takvim');
  }, []);

  /* ---- Randevu ---- */
  const addRandevu = useCallback(
    (r) => {
      const id = 'r' + Date.now() + Math.random().toString(36).slice(2, 6);
      const toplam = hizmetler.find((h) => h.id === r.hizmetId)?.fiyat || 0;
      const bitis = dkSaate(saatDk(r.baslangic) + r.sureDakika);
      const yeni = { ...r, id, grupId: id, bitis, toplamTutar: toplam, odenenTutar: 0, createdAt: bugun };
      setRandevular((prev) => [...prev, yeni]);
      const eg = egitmenler.find((x) => x.id === r.egitmenId);
      const kes = eg?.hizmetUcretleri?.[r.hizmetId] ?? 0;
      setKazanc((prev) => [
        ...prev,
        { id: 'k' + Date.now(), egitmenId: r.egitmenId, randevuId: id, tutar: kes, durum: 'beklemede', tarih: r.tarih },
      ]);
    },
    [hizmetler, egitmenler],
  );

  const updateRandevu = useCallback((id, r) => {
    setRandevular((prev) => prev.map((x) => (x.id === id ? { ...x, ...r } : x)));
  }, []);

  const deleteRandevuGrup = useCallback((randevu) => {
    const grp = randevu.grupId;
    setRandevular((prev) => {
      const ids = prev.filter((r) => r.grupId === grp).map((r) => r.id);
      setOdeme((p) => p.filter((o) => !ids.includes(o.randevuId)));
      setKazanc((p) => p.filter((k) => !ids.includes(k.randevuId)));
      return prev.filter((r) => r.grupId !== grp);
    });
  }, []);

  const setRandevuDurum = useCallback((id, durum) => {
    setRandevular((prev) => prev.map((r) => (r.id === id ? { ...r, durum } : r)));
  }, []);

  /* ---- Odeme (randevu bazli, ayrisik) ---- */
  const tahsilEt = useCallback((randevuId, tutar) => {
    const r = randevular.find((x) => x.id === randevuId);
    if (!r) return;
    const yeni = Math.min(r.toplamTutar, r.odenenTutar + tutar);
    setRandevular((prev) => prev.map((x) => (x.id === randevuId ? { ...x, odenenTutar: yeni } : x)));
    setOdeme((prev) => [
      ...prev,
      { id: 'o' + Date.now() + Math.random().toString(36).slice(2, 5), randevuId, musteriId: r.musteriId, tutar, tur: 'tahsil', tarih: bugun },
    ]);
  }, [randevular]);

  const iadeEt = useCallback((randevuId, tutar) => {
    const r = randevular.find((x) => x.id === randevuId);
    if (!r) return;
    const yeni = Math.max(0, r.odenenTutar - tutar);
    setRandevular((prev) => prev.map((x) => (x.id === randevuId ? { ...x, odenenTutar: yeni } : x)));
    setOdeme((prev) => [
      ...prev,
      { id: 'o' + Date.now() + Math.random().toString(36).slice(2, 5), randevuId, musteriId: r.musteriId, tutar, tur: 'iade', tarih: bugun },
    ]);
  }, [randevular]);

  /* ---- Musteri ---- */
  const addMusteri = useCallback((m) => {
    setMusteriler((prev) => [...prev, { ...m, id: 'm' + Date.now(), createdAt: bugun }]);
  }, []);
  const editMusteri = useCallback((id, m) => {
    setMusteriler((prev) => prev.map((x) => (x.id === id ? { ...x, ...m } : x)));
  }, []);
  const deleteMusteri = useCallback((id) => {
    setMusteriler((prev) => prev.filter((x) => x.id !== id));
    setRandevular((prev) => prev.filter((r) => r.musteriId !== id));
    setOdeme((prev) => prev.filter((o) => o.musteriId !== id));
  }, []);

  /* ---- Hizmet ---- */
  const addHizmet = useCallback((h) => {
    const id = 'h' + Date.now();
    setHizmetler((prev) => [...prev, { ...h, id }]);
    setEgitmenler((prev) => prev.map((e) => ({ ...e, hizmetUcretleri: { ...e.hizmetUcretleri, [id]: h.fiyat } })));
  }, []);
  const editHizmet = useCallback((id, h) => {
    setHizmetler((prev) => prev.map((x) => (x.id === id ? { ...x, ...h } : x)));
  }, []);
  const deleteHizmet = useCallback((id) => {
    setHizmetler((prev) => prev.filter((x) => x.id !== id));
    setEgitmenler((prev) =>
      prev.map((e) => {
        const kopy = { ...e.hizmetUcretleri };
        delete kopy[id];
        return { ...e, hizmetUcretleri: kopy };
      }),
    );
    setRandevular((prev) => prev.filter((r) => r.hizmetId !== id));
  }, []);

  /* ---- Egitmen ---- */
  const addEgitmen = useCallback((e) => {
    setEgitmenler((prev) => [...prev, { ...e, id: 'e' + Date.now() }]);
  }, []);
  const editEgitmen = useCallback((id, e) => {
    setEgitmenler((prev) => prev.map((x) => (x.id === id ? { ...x, ...e } : x)));
  }, []);
  const deleteEgitmen = useCallback((id) => {
    setEgitmenler((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /* ---- Gider ---- */
  const addGider = useCallback((g) => {
    setGider((prev) => [...prev, { ...g, id: 'g' + Date.now() }]);
  }, []);
  const editGider = useCallback((id, g) => {
    setGider((prev) => prev.map((x) => (x.id === id ? { ...x, ...g } : x)));
  }, []);
  const deleteGider = useCallback((id) => {
    setGider((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /* ---- Profil ---- */
  const updateUser = useCallback((data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  }, []);

  if (!loggedIn || !user) {
    return <Login onLogin={handleLogin} />;
  }

  const baslikMap = {
    takvim: 'Ajanda',
    musteriler: 'Müşteriler',
    diger: 'Hesabım',
    hizmetler: 'Hizmetler',
    egitmenler: 'Eğitmenler',
    'egitmen-raporlari': 'Eğitmen Raporları',
    giderler: 'Giderler',
    karzarar: 'Kar/Zarar',
    istatistik: 'İstatistik',
    profil: 'Profil',
    egitmenKazanc: 'Eğitmen Kazancı',
  };

  const bottomItems = [
    { key: 'takvim', label: 'Takvim', icon: '📅' },
    { key: 'musteriler', label: 'Müşteriler', icon: '👥' },
    { key: 'diger', label: 'Diğer', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold text-sm">SG</div>
          <span className="font-bold text-slate-900 text-sm">{baslikMap[activeScreen] || 'Studio G'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">{role === 'admin' ? 'Yönetici' : 'Eğitmen'}</span>
          <ButtonOutline onClick={handleLogout} className="px-3 py-1.5 text-xs">Çıkış</ButtonOutline>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeScreen === 'takvim' && (
          <TakvimView
            user={user}
            role={role}
            randevular={randevular}
            egitmenler={egitmenler}
            musteriler={musteriler}
            hizmetler={hizmetler}
            odemeler={odemeler}
            kazanclar={kazanclar}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setActiveScreen={setActiveScreen}
            addRandevu={addRandevu}
            updateRandevu={updateRandevu}
            deleteRandevuGrup={deleteRandevuGrup}
            setRandevuDurum={setRandevuDurum}
            tahsilEt={tahsilEt}
            iadeEt={iadeEt}
          />
        )}
        {activeScreen === 'musteriler' && (
          <ClientsView
            musteriler={musteriler}
            randevular={randevular}
            hizmetler={hizmetler}
            egitmenler={egitmenler}
            setActiveScreen={setActiveScreen}
            addMusteri={addMusteri}
            editMusteri={editMusteri}
            deleteMusteri={deleteMusteri}
            tahsilEt={tahsilEt}
          />
        )}
        {activeScreen === 'diger' && (
          <DigerView user={user} role={role} setActiveScreen={setActiveScreen} />
        )}
        {activeScreen === 'hizmetler' && (
          <ServicesView
            hizmetler={hizmetler}
            setActiveScreen={setActiveScreen}
            addHizmet={addHizmet}
            editHizmet={editHizmet}
            deleteHizmet={deleteHizmet}
          />
        )}
        {activeScreen === 'egitmenler' && (
          <TrainersView
            egitmenler={egitmenler}
            hizmetler={hizmetler}
            setActiveScreen={setActiveScreen}
            addEgitmen={addEgitmen}
            editEgitmen={editEgitmen}
            deleteEgitmen={deleteEgitmen}
          />
        )}
        {activeScreen === 'egitmen-raporlari' && (
          <RaporView
            egitmenler={egitmenler}
            randevular={randevular}
            kazanclar={kazanclar}
            setActiveScreen={setActiveScreen}
          />
        )}
        {activeScreen === 'egitmenKazanc' && (
          <EgitmenKazancView
            egitmenler={egitmenler}
            randevular={randevular}
            kazanclar={kazanclar}
            setActiveScreen={setActiveScreen}
          />
        )}
        {activeScreen === 'giderler' && (
          <GiderView
            giderler={giderler}
            egitmenler={egitmenler}
            setActiveScreen={setActiveScreen}
            addGider={addGider}
            editGider={editGider}
            deleteGider={deleteGider}
          />
        )}
        {activeScreen === 'karzarar' && (
          <KarZararView
            odemeler={odemeler}
            giderler={giderler}
            kazanclar={kazanclar}
            setActiveScreen={setActiveScreen}
          />
        )}
        {activeScreen === 'istatistik' && (
          <IstatistikView
            randevular={randevular}
            musteriler={musteriler}
            hizmetler={hizmetler}
            odemeler={odemeler}
            giderler={giderler}
            egitmenler={egitmenler}
            setActiveScreen={setActiveScreen}
          />
        )}
        {activeScreen === 'profil' && (
          <ProfilView user={user} setActiveScreen={setActiveScreen} updateUser={updateUser} />
        )}
      </div>

      <div className="bg-white border-t border-slate-200 shrink-0">
        <div className="flex justify-around py-2 px-2">
          {bottomItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveScreen(item.key)}
              className={
                'flex flex-col items-center gap-1 text-xs transition ' +
                (activeScreen === item.key ? 'text-violet-600 font-bold' : 'text-slate-400')
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
