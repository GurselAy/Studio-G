import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { X } from './Icons';
export default function PackageModal({ isOpen, onClose, onSuccess, musteri }) {
  const [hizmetler, setHizmetler] = useState([]); const [secilenHizmet, setSecilenHizmet] = useState(''); const [seansSayisi, setSeansSayisi] = useState(10); const [toplamUcret, setToplamUcret] = useState(''); const [odenenTutar, setOdenenTutar] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (isOpen) getir(); }, [isOpen]);
  const getir = async () => { const { data } = await supabase.from('hizmetler').select('id, adi'); if (data && data.length > 0) { setHizmetler(data); setSecilenHizmet(data[0].id); } };
  const kaydet = async (e) => { e.preventDefault(); setLoading(true); const ucret = parseFloat(toplamUcret) || 0; const odenen = parseFloat(odenenTutar) || 0; let durum = 'Ödenmedi'; if (odenen >= ucret && ucret > 0) durum = 'Ödendi'; else if (odenen > 0) durum = 'Kısmi Ödendi'; const { data: paket, error } = await supabase.from('musteri_paketleri').insert([{ musteri_id: musteri.id, hizmet_id: secilenHizmet, toplam_seans: parseInt(seansSayisi), kalan_seans: parseInt(seansSayisi), ucret, odenen_tutar: odenen, odeme_durumu: durum, durum: true }]).select().single(); if (!error && odenen > 0 && paket) { await supabase.from('odeme_hareketleri').insert([{ paket_id: paket.id, musteri_id: musteri.id, tutar: odenen }]); } if (!error) { onSuccess(); onClose(); } else alert(error.message); setLoading(false); };
  if (!isOpen || !musteri) return null;
  const kalanBorc = Math.max(0, (parseFloat(toplamUcret) || 0) - (parseFloat(odenenTutar) || 0));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4"><div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100"><div><h2 className="text-[15px] font-extrabold text-slate-900">Paket Satışı & Ödeme</h2><p className="text-[11px] font-extrabold text-[#5b46f5]">{musteri.adi}</p></div><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
      <form onSubmit={kaydet} className="mt-4 space-y-3">
        <div><label className="text-xs font-extrabold text-slate-900 block mb-1">Ders / Hizmet</label><select value={secilenHizmet} onChange={e=>setSecilenHizmet(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold">{hizmetler.map(h=><option key={h.id} value={h.id}>{h.adi}</option>)}</select></div>
        <div><label className="text-xs font-extrabold text-slate-900 block mb-1">Toplam Seans</label><input type="tel" inputMode="numeric" pattern="[0-9]*" min="1" required value={seansSayisi} onChange={e=>setSeansSayisi(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-extrabold" /></div>
        <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-extrabold text-slate-900 block mb-1">Paket Fiyatı (TL)</label><input type="tel" inputMode="numeric" pattern="[0-9]*" required value={toplamUcret} onChange={e=>setToplamUcret(e.target.value)} placeholder="8000" className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-extrabold" /></div><div><label className="text-xs font-extrabold text-slate-900 block mb-1">Tahsil Edilen (TL)</label><input type="tel" inputMode="numeric" pattern="[0-9]*" value={odenenTutar} onChange={e=>setOdenenTutar(e.target.value)} placeholder="4000" className="w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-extrabold" /></div></div>
        {toplamUcret && <div className="bg-slate-50 p-2.5 rounded-xl border flex justify-between text-xs"><span className="font-extrabold text-slate-600">Kalan Bakiye:</span><span className={`font-extrabold ${kalanBorc>0?'text-amber-600':'text-emerald-600'}`}>{kalanBorc>0?`${kalanBorc} TL Borç`:'Tamamı Ödendi'}</span></div>}
        <button type="submit" disabled={loading} className="w-full mt-3 py-3 bg-[#5b46f5] text-white rounded-xl text-xs font-extrabold shadow">{loading?'Kaydediliyor...':'Paketi ve Ödemeyi Onayla'}</button>
      </form>
    </div></div>
  );
}