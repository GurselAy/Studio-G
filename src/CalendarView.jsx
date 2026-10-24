import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import TakvimView from './TakvimView.jsx';
import AjandaView from './AjandaView.jsx';
import ClientsView from './ClientsView.jsx';
// import DigerView from './DigerView.jsx';
import NewAppointmentModal from './NewAppointmentModal.jsx';
import RandevuDetailModal from './RandevuDetailModal.jsx';
import { CalendarIcon, Users, Clock, Plus, ChevronLeft, ChevronRight, UserCircle } from './Icons.jsx';
import { useMasaustu } from './useMasaustu.js';

const DigerView = React.lazy(() => import('./DigerView.jsx'));

const SEKMELER = [
  { key: 'takvim', label: 'Takvim', icon: CalendarIcon },
  { key: 'ajanda', label: 'Ajanda', icon: Clock },
  { key: 'musteriler', label: 'Müşteriler', icon: Users },
  { key: 'diger', label: 'Diğer', icon: UserCircle },
];

const SEKME_BASLIK = {
  takvim: 'Takvim',
  ajanda: 'Ajanda',
  musteriler: 'Müşteriler',
  diger: 'Diğer',
};

export default function CalendarView() {
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [secilenTarih, setSecilenTarih] = useState(new Date().toISOString().slice(0, 10));
  const [secilenEgitmen, setSecilenEgitmen] = useState('tumu');
  const [egitmenler, setEgitmenler] = useState([]);
  const [userRole, setUserRole] = useState('Eğitmen');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [secilenRandevu, setSecilenRandevu] = useState(null);
  const [detayAcik, setDetayAcik] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const yenile = useCallback(() => setRefreshKey((k) => k + 1), []);
  const masaustu = useMasaustu();

  /* AÇILIŞ: tek ağ turu.
     - getUser() yerine getSession()  → /auth/v1/user çağrısı yok (yerelden okur)
     - kullanicilar 1 kez çekilir     → kendi rolüm de aynı listeden bulunur */
  useEffect(() => {
    let iptal = false;
    const acilis = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      if (iptal) return;
      setUserId(uid);

      const { data: eg } = await supabase
        .from('kullanicilar')
        .select('id,adi,rol')
        .order('adi');
      if (iptal || !eg) return;
      setEgitmenler(eg);

      const ben = eg.find((k) => k.id === uid);
      if (ben) {
        setUserRole(ben.rol);
        setUserName(ben.adi);
        if (ben.rol === 'Eğitmen') setSecilenEgitmen(uid);
      }
    };
    acilis();
    return () => { iptal = true; };
  }, []);

  const siraliEgitmenler = useMemo(() => {
    if (!Array.isArray(egitmenler) || egitmenler.length === 0) return [];
    const adminler = egitmenler.filter((e) => e.rol === 'Admin');
    const egitmenlerOnly = egitmenler.filter((e) => e.rol !== 'Admin');
    return [...adminler, ...egitmenlerOnly];
  }, [egitmenler]);

  const randevuAc = (r) => {
    setSecilenRandevu(r);
    setDetayAcik(true);
  };

  /* ---------------- ORTAK İÇERİK (her iki düzende aynı) ---------------- */
  const icerik = (
    <>
      {(aktifSekme === 'takvim' || aktifSekme === 'ajanda') && (
        <WeekHeader
          secilenTarih={secilenTarih}
          setSecilenTarih={setSecilenTarih}
          userName={userName}
          masaustu={masaustu}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {aktifSekme === 'takvim' && (
          <TakvimView
            key={`takvim-${refreshKey}`}
            secilenTarih={secilenTarih}
            setSecilenTarih={setSecilenTarih}
            egitmenler={siraliEgitmenler}
            userId={userId}
            userRole={userRole}
            onRandevuClick={randevuAc}
          />
        )}
        {aktifSekme === 'ajanda' && (
          <AjandaView
            key={`ajanda-${refreshKey}`}
            secilenTarih={secilenTarih}
            setSecilenTarih={setSecilenTarih}
            secilenEgitmen={secilenEgitmen}
            setSecilenEgitmen={setSecilenEgitmen}
            egitmenler={siraliEgitmenler}
            userId={userId}
            userRole={userRole}
            onRandevuClick={randevuAc}
          />
        )}
        {aktifSekme === 'musteriler' && <ClientsView key={`musteriler-${refreshKey}`} userRole={userRole} />}
        {aktifSekme === 'diger' && (
          <React.Suspense fallback={<div className="p-6 text-center text-xs font-bold text-slate-400">Yükleniyor...</div>}>
            <DigerView userRole={userRole} />
          </React.Suspense>
        )}
      </div>
    </>
  );

  const modallar = (
    <>
      {modalAcik && (
        <NewAppointmentModal
          isOpen={modalAcik}
          onClose={() => setModalAcik(false)}
          onSuccess={yenile}
          secilenTarih={secilenTarih}
        />
      )}
      {detayAcik && secilenRandevu && (
        <RandevuDetailModal
          isOpen={detayAcik}
          onClose={() => {
            setDetayAcik(false);
            setSecilenRandevu(null);
          }}
          onSuccess={yenile}
          randevu={secilenRandevu}
          egitmenler={egitmenler}
        />
      )}
    </>
  );

  /* --------------------------- MASAÜSTÜ (PC) --------------------------- */
  if (masaustu) {
    return (
      <div className="flex min-h-[100dvh] bg-slate-50">
        <Sidebar
          aktifSekme={aktifSekme}
          setAktifSekme={setAktifSekme}
          onYeni={() => setModalAcik(true)}
          userName={userName}
          userRole={userRole}
        />

        <div className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden">
          {/* üst bar */}
          <div className="bg-white border-b border-slate-200 px-6 h-16 shrink-0 flex items-center gap-4">
            <div className="min-w-0">
              <div className="text-[14px] font-extrabold text-slate-900 truncate">
                {SEKME_BASLIK[aktifSekme] || 'Studio G'}
              </div>
              <div className="text-[11px] font-bold text-slate-400 truncate">
                İyi günler, {userName || 'Kullanıcı'}
              </div>
            </div>
            <button
              onClick={() => setModalAcik(true)}
              className="ml-auto bg-[#5b46f5] hover:bg-[#4c3ae0] text-white px-4 py-2 rounded-xl text-[12px] font-extrabold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Randevu
            </button>
          </div>

          {icerik}
        </div>

        {modallar}
      </div>
    );
  }

  /* ----------------------------- MOBİL (aynı) ----------------------------- */
  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 max-w-md mx-auto shadow-2xl overflow-hidden">
      <div className="bg-[#f59a00] px-4 py-1 flex items-center border-b border-amber-600/30">
        <Logo />
        <button
          onClick={() => setModalAcik(true)}
          className="ml-auto bg-[#5b46f5] text-white px-4 py-1.5 rounded-full text-xs font-extrabold"
        >
          + Randevu
        </button>
      </div>

      {icerik}

      {modallar}

      <BottomNav aktifSekme={aktifSekme} setAktifSekme={setAktifSekme} setModalAcik={setModalAcik} />
    </div>
  );
}

/* ------------------------------- LOGO ------------------------------- */
function Logo() {
  return (
    <div className="relative w-20 h-14 flex items-center justify-center select-none shrink-0">
      <span
        className="absolute text-[60px] leading-none text-black"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        G
      </span>
      <span
        className="relative z-10 text-[14px] tracking-[0.18em] text-black whitespace-nowrap bg-[#f59a00] px-0.5 leading-none"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        STUDIO'G
      </span>
    </div>
  );
}

/* ------------------------------ SIDEBAR (PC) ------------------------------ */
function Sidebar({ aktifSekme, setAktifSekme, onYeni, userName, userRole }) {
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col h-[100dvh] sticky top-0">
      <div className="bg-[#f59a00] px-3 h-16 flex items-center border-b border-amber-600/30">
        <Logo />
      </div>

      <div className="p-3">
        <button
          onClick={onYeni}
          className="w-full flex items-center justify-center gap-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white py-2.5 rounded-xl text-[12px] font-extrabold transition"
        >
          <Plus className="w-4 h-4" /> Yeni Randevu
        </button>
      </div>

      <nav className="px-3 pb-3 space-y-1 flex-1 overflow-y-auto">
        {SEKMELER.map((s) => {
          const Icon = s.icon;
          const secili = aktifSekme === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setAktifSekme(s.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition ${
                secili
                  ? 'bg-indigo-50 text-[#5b46f5]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 text-[#5b46f5] flex items-center justify-center text-[12px] font-extrabold">
            {(userName || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold text-slate-900 truncate">{userName || 'Kullanıcı'}</div>
            <div className="text-[10px] font-bold text-slate-400 truncate">{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------ HAFTA BAŞLIĞI ------------------------------ */
function WeekHeader({ secilenTarih, setSecilenTarih, userName, masaustu }) {
  const tarihRef = useRef(null);
  const tarihAc = () => {
    const el = tarihRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
    } catch (_) {}
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const getWeekDays = (s) => {
    const date = new Date(s + 'T12:00:00');
    const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
    const mon = new Date(date);
    mon.setDate(date.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  };
  const weekDays = getWeekDays(secilenTarih);
  const weekLabels = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
  const d = new Date(secilenTarih + 'T12:00:00');
  const gunAy = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const haftagun = d.toLocaleDateString('tr-TR', { weekday: 'long' });
  const tam = d.toLocaleDateString('tr-TR');
  const tarihArttir = (g) => {
    const dt = new Date(secilenTarih + 'T12:00:00');
    dt.setDate(dt.getDate() + g);
    setSecilenTarih(dt.toISOString().slice(0, 10));
  };
  return (
    <div className="bg-white border-b shrink-0">
      <div className={masaustu ? 'px-6 pt-3' : 'px-3 pt-2'}>
        {!masaustu && (
          <div className="text-[13px] font-bold text-slate-500">
            İyi günler, <span className="text-slate-900 font-extrabold">{userName || 'Kullanıcı'}</span>
          </div>
        )}
        <div className="flex justify-between items-center mt-1">
          <label className="relative inline-flex items-center min-h-[32px] pr-2 text-[13px] md:text-[14px] font-extrabold capitalize text-left cursor-pointer">
            <span className="pointer-events-none">{gunAy} {haftagun} • {tam}</span>
            <input
              ref={tarihRef}
              type="date"
              value={secilenTarih}
              onChange={(e) => { if (e.target.value) setSecilenTarih(e.target.value); }}
              onClick={tarihAc}
              onFocus={tarihAc}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ fontSize: 16, minHeight: 32 }}
            />
          </label>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSecilenTarih(todayStr)}
              className="text-[11px] md:text-[12px] font-extrabold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-100 transition"
            >
              Bugün
            </button>
            <button
              onClick={() => tarihArttir(-1)}
              className="w-7 h-7 md:w-8 md:h-8 border rounded-full flex items-center justify-center hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => tarihArttir(1)}
              className="w-7 h-7 md:w-8 md:h-8 border rounded-full flex items-center justify-center hover:bg-slate-50 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`px-2 py-2.5 grid grid-cols-7 gap-1 ${masaustu ? 'md:px-4 md:gap-2' : ''}`}>
        {weekDays.map((day, i) => {
          const iso = day.toISOString().slice(0, 10);
          const secili = iso === secilenTarih;
          return (
            <button
              key={i}
              onClick={() => setSecilenTarih(iso)}
              className={`py-2 rounded-xl transition ${
                secili
                  ? 'bg-[#5b46f5] text-white shadow'
                  : 'bg-[#f8f7ff] text-slate-600 hover:bg-indigo-50'
              }`}
            >
              <div className="text-[9px] md:text-[10px] font-extrabold">{weekLabels[i]}</div>
              <div className="text-[13px] md:text-[15px] font-extrabold">{day.getDate()}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ ALT MENÜ (mobil) ------------------------------ */
function BottomNav({ aktifSekme, setAktifSekme, setModalAcik }) {
  const items = [
    { key: 'takvim', label: 'Takvim', icon: CalendarIcon },
    { key: 'ajanda', label: 'Ajanda', icon: Clock },
    { key: 'yeni', label: 'Yeni', icon: Plus, action: () => setModalAcik(true) },
    { key: 'musteriler', label: 'Müşteriler', icon: Users },
    { key: 'diger', label: 'Diğer', icon: UserCircle },
  ];
  return (
    <div className="bg-white border-t px-2 py-1 flex justify-around shrink-0">
      {items.map((item) => {
        const Icon = item.icon;
        if (item.key === 'yeni') {
          return (
            <button
              key={item.key}
              onClick={item.action}
              className="flex flex-col items-center p-1"
            >
              <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold">{item.label}</span>
            </button>
          );
        }
        return (
          <button
            key={item.key}
            onClick={() => setAktifSekme(item.key)}
            className={`flex flex-col items-center p-1.5 ${
              aktifSekme === item.key ? 'text-[#5b46f5]' : 'text-slate-400'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-extrabold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
