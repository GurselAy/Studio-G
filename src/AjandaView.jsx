import React, { useEffect, useRef, useState } from 'react';
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
    const start = new Date(`${secilenTarih}T00:00:00+03:00`).toISOString();
    const end = new Date(`${moveDay(secilenTarih, 1)}T00:00:00+03:00`).toISOString();
    let query = supabase.from('randevular')
      .select('id,hizmet_id,egitmen_id,seri_id,baslangic_saati,bitis_saati,durum,hizmetler(adi,tur,katilim_sayisi),kullanicilar(adi),randevu_katilimcilari(id,musteri_id,paket_id,musteriler(adi,telefon))')
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
    const ids = [...new Set(rows.flatMap((r) => (r.randevu_katilimcilari || []).map((k) => k.musteri_id)).filter(Boolean))];
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

  const paketFor = (r, k) => {
    const packages = paketMap[`${k.musteri_id}_${r.hizmet_id}`] || [];
    const exact = k.paket_id ? packages.find((p) => p.id === k.paket_id) : null;
    return exact
      || packages.find((p) => Number(p.ucret) > Number(p.odenen_tutar))
      || packages.find((p) => p.durum && Number(p.kalan_seans) > 0)
      || null;
  };
  const borrow = (p) => Math.max(0, Number(p?.ucret || 0) - Number(p?.odenen_tutar || 0));
  const pay = (r, k) => {
    const paket = paketFor(r, k);
    if (paket && borrow(paket) > 0) setOdeme({ paket, musteri: { id: k.musteri_id, adi: k.musteriler?.adi } });
  };
  const wa = (tel) => {
    let number = (tel || '').replace(/\D/g, '');
    if (!number) return;
    if (number.startsWith('0')) number = number.slice(1);
    if (!number.startsWith('90')) number = `90${number}`;
    window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer');
  };

  const q = arama.toLocaleLowerCase('tr-TR');
  const visible = randevular.filter((r) => !arama || (r.randevu_katilimcilari || []).some((k) =>
    (k.musteriler?.adi || '').toLocaleLowerCase('tr-TR').includes(q) ||
    (k.musteriler?.telefon || '').includes(arama)));

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
      <div className="bg-white p-2 md:px-4 md:py-3 border-b space-y-2 shrink-0">
        {userRole === 'Admin' && <div className="flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
          <button onClick={() => setSecilenEgitmen('tumu')} className="shrink-0 px-3 py-1.5 rounded-full text-[11px] md:text-[12px] font-extrabold bg-slate-100 md:hover:bg-slate-200 transition">Tümü</button>
          {egitmenler.map((e) => <button key={e.id} onClick={() => setSecilenEgitmen(e.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] md:text-[12px] font-extrabold transition ${secilenEgitmen === e.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 md:hover:bg-slate-200'}`}>{e.adi}</button>)}
        </div>}
        <div className="relative md:max-w-md"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Üye veya telefon ara..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs md:text-[13px] font-bold md:hover:border-slate-300 transition" /></div>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 md:p-4 space-y-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:auto-rows-min md:content-start">
        {hata && <p className="text-xs md:text-[13px] text-red-600 md:col-span-full">{hata}</p>}
        {loading ? <p className="text-center py-10 text-xs md:text-[13px] font-bold md:col-span-full">Yükleniyor</p> : visible.length === 0 ? <p className="text-center py-16 text-xs md:text-[13px] font-bold text-slate-400 md:col-span-full">Randevu yok</p> : visible.map((r) => {
          const katilim = r.randevu_katilimcilari || [];
          const isGroup = r.hizmetler?.tur === 'Grup';
          const [label, badge] = status(r);
          const trainerIndex = egitmenler.findIndex((e) => e.id === r.egitmen_id);
          const ilkPaket = katilim[0] ? paketFor(r, katilim[0]) : null;
          return <div key={r.id} className="bg-white rounded-xl p-2.5 md:p-3.5 shadow-sm border border-slate-100 md:hover:shadow-md md:hover:border-indigo-200 transition">
            <div className="flex items-center justify-between gap-1">
              <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] md:text-[11px] font-extrabold ${badge}`}><Clock className="w-3 h-3" />{time(r.baslangic_saati)} - {time(r.bitis_saati)}</span>
              <div className="flex items-center gap-1"><span className="rounded-full px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-white" style={{ backgroundColor: COLORS[trainerIndex < 0 ? 0 : trainerIndex % COLORS.length] }}>{r.kullanicilar?.adi?.split(' ')[0]}</span><span className={`rounded-full px-2 py-0.5 text-[9px] md:text-[10px] font-bold ${badge}`}>{label}</span></div>
            </div>
            <div className="mt-2 text-[11px] md:text-[12px] font-bold text-slate-600">
              {r.hizmetler?.adi} {isGroup ? `Grup ${katilim.length}/${r.hizmetler?.katilim_sayisi || 1}` : 'Bireysel'}
              {isGroup && ilkPaket && <span className="text-indigo-700"> Seans: {ilkPaket.kalan_seans}/{ilkPaket.toplam_seans}</span>}
            </div>
            <div className="mt-2 space-y-1">
              {katilim.map((k) => {
                const paket = paketFor(r, k);
                const debt = borrow(paket);
                return <div key={k.id} className="flex items-center justify-between gap-2 py-1 border-t border-slate-50">
                  <div className="min-w-0"><div className="text-xs md:text-[13px] font-extrabold truncate">{k.musteriler?.adi || 'Müşteri'}</div>{!isGroup && paket && <div className="text-[10px] md:text-[11px] text-indigo-700">{paket.kalan_seans}/{paket.toplam_seans} seans</div>}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    {debt > 0 && <button onClick={() => pay(r, k)} className="px-2 py-1 text-[10px] md:text-[11px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-1 md:hover:bg-amber-100 transition"><CreditCard className="w-3 h-3" />{money(debt)} TL Alacak</button>}
                    <a href={`tel:${k.musteriler?.telefon || ''}`} className="w-6 h-6 md:w-7 md:h-7 bg-slate-50 border rounded-full flex items-center justify-center md:hover:bg-slate-100 transition"><Phone className="w-3 h-3" /></a>
                    <button onClick={() => wa(k.musteriler?.telefon)} className="w-6 h-6 md:w-7 md:h-7 bg-emerald-50 rounded-full flex items-center justify-center md:hover:bg-emerald-100 transition"><MessageSquare className="w-3 h-3 text-emerald-600" /></button>
                  </div>
                </div>;
              })}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => onRandevuClick(r)} className="text-[10px] md:text-[11px] font-extrabold border px-3 py-1 rounded-full md:hover:bg-slate-50 md:hover:border-slate-400 transition">Detay</button>
            </div>
          </div>;
        })}
      </div>
      {odeme && <OdemeModal isOpen paket={odeme.paket} musteri={odeme.musteri} onClose={() => setOdeme(null)} onSuccess={() => { setOdeme(null); randevulariGetir(); }} />}
    </div>
  );
}
