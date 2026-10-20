import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { Phone, MessageSquare, Clock, Search, CreditCard } from './Icons.jsx';
import OdemeModal from './OdemeModal.jsx';

const COLORS = ['#2563eb', '#16a34a', '#c026d3', '#f97316', '#0891b2', '#7c3aed'];
const money = (value) => Number(value || 0).toLocaleString('tr-TR');
const time = (value) => new Date(value).toLocaleTimeString('tr-TR', {
  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul',
});
const dayString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const moveDay = (date, step) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + step);
  return dayString(d);
};

export default function AjandaView({ secilenTarih, setSecilenTarih, secilenEgitmen, setSecilenEgitmen, egitmenler = [], userId, userRole, onRandevuClick }) {
  const [arama, setArama] = useState('');
  const [randevular, setRandevular] = useState([]);
  const [paketMap, setPaketMap] = useState({});
  const [odeme, setOdeme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState('');
  const touch = useRef(null);

  const randevulariGetir = async (cancelled = () => false) => {
    setLoading(true);
    setHata('');
    // Supabase timestamptz stores UTC; the selected calendar day is Istanbul time.
    const start = new Date(`${secilenTarih}T00:00:00+03:00`).toISOString();
    const end = new Date(`${moveDay(secilenTarih, 1)}T00:00:00+03:00`).toISOString();
    let query = supabase.from('randevular')
      .select('id,musteri_id,hizmet_id,egitmen_id,baslangic_saati,bitis_saati,durum,grup_id,musteriler(adi,telefon),hizmetler(adi,tur,katilim_sayisi),kullanicilar(adi)')
      .gte('baslangic_saati', start).lt('baslangic_saati', end).order('baslangic_saati');
    if (userRole !== 'Admin') {
      if (!userId) { setLoading(false); return; }
      query = query.eq('egitmen_id', userId).eq('durum', 'planlandı');
    } else if (secilenEgitmen && secilenEgitmen !== 'tumu') {
      query = query.eq('egitmen_id', secilenEgitmen);
    }
    const { data, error } = await query;
    if (cancelled()) return;
    if (error) { setHata(error.message); setLoading(false); return; }
    const rows = data || [];
    setRandevular(rows);
    const ids = [...new Set(rows.map((r) => r.musteri_id).filter(Boolean))];
    if (!ids.length) { setPaketMap({}); setLoading(false); return; }
    const { data: packages, error: packageError } = await supabase.from('musteri_paketleri')
      .select('id,musteri_id,hizmet_id,toplam_seans,kalan_seans,ucret,odenen_tutar,durum,olusturma_tarihi,hizmetler(adi)')
      .in('musteri_id', ids).order('olusturma_tarihi', { ascending: true });
    if (cancelled()) return;
    if (packageError) setHata(packageError.message);
    const map = {};
    (packages || []).forEach((p) => {
      const key = `${p.musteri_id}_${p.hizmet_id}`;
      (map[key] ||= []).push(p);
    });
    setPaketMap(map);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Keep the existing automatic completion behavior; cancelled sessions are excluded.
      const { data: past, error } = await supabase.from('randevular')
        .select('id').eq('durum', 'planlandı')
        .lt('bitis_saati', new Date().toISOString()).limit(50);
      if (error && !cancelled) setHata(error.message);
      if (past?.length) {
        const { error: updateError } = await supabase.from('randevular')
          .update({ durum: 'tamamlandı' }).in('id', past.map((r) => r.id));
        if (updateError && !cancelled) setHata(updateError.message);
      }
      if (!cancelled) await randevulariGetir(() => cancelled);
    };
    load();
    return () => { cancelled = true; };
  }, [secilenTarih, secilenEgitmen, userId, userRole]);

  const paketFor = (r) => {
    const packages = paketMap[`${r.musteri_id}_${r.hizmet_id}`] || [];
    // Existing schema has no randevular.paket_id; match customer + service.
    return packages.find((p) => Number(p.ucret) > Number(p.odenen_tutar))
      || packages.find((p) => p.durum && Number(p.kalan_seans) > 0) || null;
  };
  const borrow = (p) => Math.max(0, Number(p?.ucret || 0) - Number(p?.odenen_tutar || 0));
  const pay = (r) => {
    const paket = paketFor(r);
    if (paket && borrow(paket) > 0) setOdeme({ paket, musteri: { id: r.musteri_id, adi: r.musteriler?.adi } });
  };
  const wa = (tel) => {
    let number = (tel || '').replace(/\D/g, '');
    if (!number) return;
    if (number.startsWith('0')) number = number.slice(1);
    if (!number.startsWith('90')) number = `90${number}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  };
  const grouped = useMemo(() => {
    const map = new Map();
    randevular.forEach((r) => {
      const key = r.grup_id || r.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.values()];
  }, [randevular]);
  const visible = grouped.filter((group) => !arama || group.some((r) =>
    (r.musteriler?.adi || '').toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR')) ||
    (r.musteriler?.telefon || '').includes(arama)));

  const status = (r) => r.durum === 'tamamlandı'
    ? ['Tamamlandı', 'bg-emerald-100 text-emerald-700']
    : r.durum === 'iptal edildi' ? ['İptal', 'bg-rose-100 text-rose-700']
      : ['Planlandı', 'bg-slate-100 text-slate-700'];

  return (
    <div className="flex flex-col h-full bg-[#f8f7ff]" onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => {
      if (!touch.current) return;
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dy = e.changedTouches[0].clientY - touch.current.y;
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) setSecilenTarih(moveDay(secilenTarih, dx < 0 ? 1 : -1));
      touch.current = null;
    }}>
      <div className="bg-white p-2 border-b space-y-2">
        {userRole === 'Admin' && <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setSecilenEgitmen('tumu')} className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-slate-100">Tümü</button>
          {egitmenler.map((e) => <button key={e.id} onClick={() => setSecilenEgitmen(e.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold ${secilenEgitmen === e.id ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{e.adi}</button>)}
        </div>}
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Üye veya telefon ara..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" /></div>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {hata && <p className="text-xs text-red-600">{hata}</p>}
        {loading ? <p className="text-center py-10 text-xs font-bold">Yükleniyor</p> : visible.length === 0 ? <p className="text-center py-16 text-xs font-bold text-slate-400">Randevu yok</p> : visible.map((group) => {
          const first = group[0];
          const isGroup = first.hizmetler?.tur === 'Grup';
          const [label, badge] = status(first);
          const trainerIndex = egitmenler.findIndex((e) => e.id === first.egitmen_id);
          return <div key={first.grup_id || first.id} className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between gap-1">
              <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold ${badge}`}><Clock className="w-3 h-3" />{time(first.baslangic_saati)} - {time(first.bitis_saati)}</span>
              <div className="flex items-center gap-1"><span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: COLORS[trainerIndex < 0 ? 0 : trainerIndex % COLORS.length] }}>{first.kullanicilar?.adi?.split(' ')[0]}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge}`}>{label}</span></div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-slate-600">{first.hizmetler?.adi} {isGroup ? `Grup ${group.length}/${first.hizmetler?.katilim_sayisi || 1}` : 'Bireysel'}</div>
            <div className="mt-2 space-y-1">
              {group.map((r) => {
                const paket = paketFor(r);
                const debt = borrow(paket);
                return <div key={r.id} className="flex items-center justify-between gap-2 py-1 border-t border-slate-50">
                  <div className="min-w-0"><div className="text-xs font-extrabold truncate">{r.musteriler?.adi || 'Müşteri'}</div>{paket && <div className="text-[10px] text-indigo-700">{paket.kalan_seans}/{paket.toplam_seans} seans</div>}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    {debt > 0 && <button onClick={() => pay(r)} className="px-2 py-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1"><CreditCard className="w-3 h-3" />{money(debt)} TL Alacak</button>}
                    <a href={`tel:${r.musteriler?.telefon || ''}`} className="w-6 h-6 bg-slate-50 border rounded-full flex items-center justify-center"><Phone className="w-3 h-3" /></a>
                    <button onClick={() => wa(r.musteriler?.telefon)} className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center"><MessageSquare className="w-3 h-3 text-emerald-600" /></button>
                  </div>
                </div>;
              })}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => onRandevuClick(first)} className="text-[10px] font-extrabold border px-3 py-1 rounded-full">Detay</button>
            </div>
          </div>;
        })}
      </div>
      {odeme && <OdemeModal isOpen paket={odeme.paket} musteri={odeme.musteri} onClose={() => setOdeme(null)} onSuccess={() => { setOdeme(null); randevulariGetir(); }} />}
    </div>
  );
}