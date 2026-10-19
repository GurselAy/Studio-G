import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import TakvimView from './TakvimView.jsx';
import AjandaView from './AjandaView.jsx';
import ClientsView from './ClientsView.jsx';
import DigerView from './DigerView.jsx';
import NewAppointmentModal from './NewAppointmentModal.jsx';
import RandevuDetailModal from './RandevuDetailModal.jsx';
import { CalendarIcon, Users, Clock, Plus, ChevronLeft, ChevronRight, UserCircle } from './Icons.jsx';

export default function CalendarView() {
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [secilenTarih, setSecilenTarih] = useState(new Date().toISOString().slice(0, 10));
  const [secilenEgitmen, setSecilenEgitmen] = useState('tumu');
  const [egitmenler, setEgitmenler] = useState([]);
  const [userRole, setUserRole] = useState('Eğitmen');
  const [userId, setUserId] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [secilenRandevu, setSecilenRandevu] = useState(null);
  const [detayAcik, setDetayAcik] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        const { data: prof } = await supabase
          .from('kullanicilar')
          .select('rol,adi')
          .eq('id', data.user.id)
          .maybeSingle();
        if (prof) {
          setUserRole(prof.rol);
          if (prof.rol === 'Eğitmen') {
            setSecilenEgitmen(data.user.id);
          }
        }
      }
    });
  }, []);

  const veriGetir = useCallback(async () => {
    const { data: eg } = await supabase
      .from('kullanicilar')
      .select('id,adi,rol')
      .order('adi');
    if (eg) setEgitmenler(eg);
  }, []);

  useEffect(() => {
    veriGetir();
  }, [veriGetir]);

  // Yönetici her zaman ilk sırada
  const siraliEgitmenler = useMemo(() => {
    if (!Array.isArray(egitmenler) || egitmenler.length === 0) return [];
    const adminler = egitmenler.filter((e) => e.rol === 'Admin');
    const egitmenlerOnly = egitmenler.filter((e) => e.rol !== 'Admin');
    return [...adminler, ...egitmenlerOnly];
  }, [egitmenler]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-md mx-auto shadow-2xl overflow-hidden">
      <div className="bg-white px-4 py-3 flex justify-between items-center border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] rounded-xl flex items-center justify-center text-white font-extrabold">G</div>
          <span className="font-extrabold text-[16px]">Studio G</span>
          <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full ml-2">
            {userRole === 'Admin' ? 'Yönetici' : 'Eğitmen'}
          </span>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="bg-[#5b46f5] text-white px-4 py-1.5 rounded-full text-xs font-extrabold"
        >
          + Randevu
        </button>
      </div>

      {(aktifSekme === 'takvim' || aktifSekme === 'ajanda') && (
        <WeekHeader secilenTarih={secilenTarih} setSecilenTarih={setSecilenTarih} />
      )}

      <div className="flex-1 overflow-hidden">
        {aktifSekme === 'takvim' && (
          <TakvimView
            secilenTarih={secilenTarih}
            setSecilenTarih={setSecilenTarih}
            egitmenler={siraliEgitmenler}
            userId={userId}
            userRole={userRole}
            onRandevuClick={(r) => {
              setSecilenRandevu(r);
              setDetayAcik(true);
            }}
          />
        )}
        {aktifSekme === 'ajanda' && (
          <AjandaView
            secilenTarih={secilenTarih}
            setSecilenTarih={setSecilenTarih}
            secilenEgitmen={secilenEgitmen}
            setSecilenEgitmen={setSecilenEgitmen}
            egitmenler={siraliEgitmenler}
            userId={userId}
            userRole={userRole}
            onRandevuClick={(r) => {
              setSecilenRandevu(r);
              setDetayAcik(true);
            }}
          />
        )}
        {aktifSekme === 'musteriler' && <ClientsView userRole={userRole} />}
        {aktifSekme === 'diger' && <DigerView userRole={userRole} />}
      </div>

      {modalAcik && (
        <NewAppointmentModal
          isOpen={modalAcik}
          onClose={() => setModalAcik(false)}
          onSuccess={() => {}}
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
          randevu={secilenRandevu}
          egitmenler={egitmenler}
        />
      )}

      <BottomNav aktifSekme={aktifSekme} setAktifSekme={setAktifSekme} setModalAcik={setModalAcik} />
    </div>
  );
}

function WeekHeader({ secilenTarih, setSecilenTarih }) {
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
    <div className="bg-white border-b">
      <div className="px-3 pt-2">
        <div className="text-[13px] font-bold text-slate-500">
          İyi günler, <span className="text-slate-900 font-extrabold">Yönetici</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[13px] font-extrabold capitalize">
            {gunAy} {haftagun} • {tam}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSecilenTarih(todayStr)}
              className="text-[11px] font-extrabold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full"
            >
              Bugün
            </button>
            <button
              onClick={() => tarihArttir(-1)}
              className="w-7 h-7 border rounded-full flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => tarihArttir(1)}
              className="w-7 h-7 border rounded-full flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="px-2 py-2.5 grid grid-cols-7 gap-1">
        {weekDays.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          return (
            <button
              key={i}
              onClick={() => setSecilenTarih(iso)}
              className={`py-2 rounded-xl ${
                iso === secilenTarih ? 'bg-[#5b46f5] text-white shadow' : 'bg-[#f8f7ff] text-slate-600'
              }`}
            >
              <div className="text-[9px] font-extrabold">{weekLabels[i]}</div>
              <div className="text-[13px] font-extrabold">{d.getDate()}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomNav({ aktifSekme, setAktifSekme, setModalAcik }) {
  const items = [
    { key: 'takvim', label: 'Takvim', icon: CalendarIcon },
    { key: 'ajanda', label: 'Ajanda', icon: Clock },
    { key: 'yeni', label: 'Yeni', icon: Plus, action: () => setModalAcik(true) },
    { key: 'musteriler', label: 'Müşteriler', icon: Users },
    { key: 'diger', label: 'Diğer', icon: UserCircle },
  ];
  return (
    <div className="bg-white border-t px-2 py-1 flex justify-around">
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