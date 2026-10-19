import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function RaporView() {
  const [stats, setStats] = useState({ bugun: 0, buAy: 0, toplamCiro: 0, toplamAlacak: 0, aktifPaket: 0, borcluPaket: 0 });
  const [alacaklilar, setAlacaklilar] = useState([]);
  const [sonOdemeler, setSonOdemeler] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getir(); }, []);
  const getir = async () => {
    setLoading(true);
    const [paketRes, odemeRes, allPaketRes] = await Promise.all([
      supabase.from('musteri_paketleri').select('*, musteriler(adi), hizmetler(adi)'),
      supabase.from('odeme_hareketleri').select('*, musteriler(adi)').order('tarih', { ascending: false }).limit(30),
      supabase.from('musteri_paketleri').select('odenen_tutar'),
    ]);
    const paketler = paketRes.data; const odemeler = odemeRes.data; const allPaketler = allPaketRes.data;
    if (paketler) {
      const bugunStart = new Date(); bugunStart.setHours(0, 0, 0, 0);
      const ayStart = new Date(); ayStart.setDate(1); ayStart.setHours(0, 0, 0, 0);
      let toplamAlacak = 0, aktif = 0, borclu = 0;
      paketler.forEach((p) => {
        const kalan = Math.max(0, parseFloat(p.ucret || 0) - parseFloat(p.odenen_tutar || 0));
        toplamAlacak += kalan;
        if (p.kalan_seans > 0 && p.durum) aktif++;
        if (kalan > 0) borclu++;
      });
      const toplamCiro = (allPaketler || []).reduce((s, p) => s + parseFloat(p.odenen_tutar || 0), 0);
      let bugun = 0, buAy = 0;
      if (odemeler) (odemeler || []).forEach((o) => { const t = new Date(o.tarih); if (t >= bugunStart) bugun += parseFloat(o.tutar || 0); if (t >= ayStart) buAy += parseFloat(o.tutar || 0); });
      setStats({ bugun, buAy, toplamCiro, toplamAlacak, aktifPaket: aktif, borcluPaket: borclu });
      setAlacaklilar(paketler.filter((p) => p.ucret - p.odenen_tutar > 0).sort((a, b) => (b.ucret - b.odenen_tutar) - (a.ucret - a.odenen_tutar)).slice(0, 15));
      setSonOdemeler(odemeler || []);
    }
    setLoading(false);
  };
  if (loading) return <div className="p-10 text-center text-xs font-bold text-slate-400">Rapor yükleniyor...</div>;
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-xl border shadow-sm"><div className="text-[10px] font-extrabold text-slate-500">BUGÜN TAHSİLAT</div><div className="text-[18px] font-extrabold text-slate-900 mt-1">{stats.bugun.toLocaleString('tr-TR')} TL</div></div>
        <div className="bg-white p-3 rounded-xl border shadow-sm"><div className="text-[10px] font-extrabold text-slate-500">BU AY CİRO</div><div className="text-[18px] font-extrabold text-[#5b46f5] mt-1">{stats.buAy.toLocaleString('tr-TR')} TL</div></div>
        <div className="bg-white p-3 rounded-xl border shadow-sm"><div className="text-[10px] font-extrabold text-slate-500">TOPLAM CİRO</div><div className="text-[16px] font-extrabold text-slate-900 mt-1">{stats.toplamCiro.toLocaleString('tr-TR')} TL</div><div className="text-[10px] font-bold text-slate-500">{stats.aktifPaket} aktif paket</div></div>
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm"><div className="text-[10px] font-extrabold text-amber-700">TOPLAM ALACAK</div><div className="text-[16px] font-extrabold text-amber-700 mt-1">{stats.toplamAlacak.toLocaleString('tr-TR')} TL</div><div className="text-[10px] font-extrabold text-amber-600">{stats.borcluPaket} pakette alacak var</div></div>
      </div>
      <div className="bg-white rounded-xl border p-3">
        <h3 className="text-[13px] font-extrabold text-slate-900 mb-2">Son Tahsilatlar</h3>
        {sonOdemeler.length === 0 ? <div className="text-[11px] font-bold text-slate-400">Henüz ödeme yok</div> : sonOdemeler.map((o) => <div key={o.id} className="flex justify-between py-2 border-b last:border-0 text-[11px]"><div><span className="font-extrabold text-slate-900">{o.musteriler?.adi}</span><span className="font-bold text-slate-500 ml-2">{new Date(o.tarih).toLocaleDateString('tr-TR')} {new Date(o.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></div><div className="font-extrabold text-emerald-600">+{parseFloat(o.tutar).toLocaleString('tr-TR')} TL</div></div>)}
      </div>
      <div className="bg-white rounded-xl border p-3">
        <h3 className="text-[13px] font-extrabold text-slate-900 mb-2">Alacak Listesi</h3>
        {alacaklilar.length === 0 ? <div className="text-[11px] font-bold text-slate-400">Alacak yok</div> : alacaklilar.map((p) => <div key={p.id} className="flex justify-between py-2 border-b last:border-0 text-[11px]"><div><div className="font-extrabold text-slate-900">{p.musteriler?.adi}</div><div className="font-bold text-slate-500">{p.hizmetler?.adi} • {p.kalan_seans}/{p.toplam_seans}</div></div><div className="text-right"><div className="font-extrabold text-amber-600">{(p.ucret - p.odenen_tutar).toLocaleString('tr-TR')} TL</div><div className="text-[10px] font-bold text-slate-400">{p.odeme_durumu}</div></div></div>)}
      </div>
    </div>
  );
}