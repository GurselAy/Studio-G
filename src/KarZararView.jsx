import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
export default function KarZararView() {
  const [ay, setAy] = useState(new Date().toISOString().slice(0,7));
  const [data, setData] = useState(null);
  useEffect(()=>{ getir(); },[ay]);
  const getir = async()=>{
    const start = new Date(ay+'-01T00:00:00'); const end = new Date(start); end.setMonth(end.getMonth()+1);
    const {data: odemeler} = await supabase.from('odeme_hareketleri').select('tutar,tarih').gte('tarih',start.toISOString()).lt('tarih',end.toISOString());
    const {data: kazanc} = await supabase.from('egitmen_kazanc_hareketleri').select('tutar,tarih').gte('tarih',start.toISOString()).lt('tarih',end.toISOString());
    const {data: gider} = await supabase.from('isletme_giderleri').select('tutar,tarih').gte('tarih',ay+'-01').lt('tarih',end.toISOString().slice(0,10));
    const gelir = (odemeler||[]).reduce((s,x)=>s+parseFloat(x.tutar),0);
    const egitmenGider = (kazanc||[]).reduce((s,x)=>s+parseFloat(x.tutar),0);
    const genelGider = (gider||[]).reduce((s,x)=>s+parseFloat(x.tutar),0);
    setData({gelir, toplamGider: egitmenGider+genelGider, net: gelir-egitmenGider-genelGider});
  };
  if(!data) return <div className="p-10 text-center text-xs font-bold">Yükleniyor</div>;
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-3 space-y-3">
      <div className="bg-white p-3 rounded-xl border flex justify-between items-center"><h2 className="text-[14px] font-extrabold text-slate-900">Kar / Zarar</h2><input type="month" value={ay} onChange={e=>setAy(e.target.value)} className="px-2 py-1 border rounded-lg text-xs font-bold" /></div>
      <div className="grid grid-cols-2 gap-2"><div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl"><div className="text-[10px] font-extrabold text-emerald-700">GELİR</div><div className="text-[16px] font-extrabold text-emerald-700">{data.gelir.toLocaleString('tr-TR')} TL</div></div><div className="bg-red-50 border border-red-200 p-3 rounded-xl"><div className="text-[10px] font-extrabold text-red-700">TOPLAM GİDER</div><div className="text-[16px] font-extrabold text-red-700">{data.toplamGider.toLocaleString('tr-TR')} TL</div></div></div>
      <div className={`p-3 rounded-xl border ${data.net>=0?'bg-[#5b46f5] text-white':'bg-red-600 text-white'}`}><div className="text-[10px] font-extrabold opacity-80">NET - {ay}</div><div className="text-[22px] font-extrabold">{data.net.toLocaleString('tr-TR')} TL</div></div>
    </div>
  );
}