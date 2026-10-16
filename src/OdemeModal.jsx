import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { X } from './Icons';
export default function OdemeModal({ isOpen, onClose, paket, musteri, onSuccess }) {
  const [ekOdeme, setEkOdeme] = useState(''); const [loading, setLoading] = useState(false);
  if (!isOpen || !paket) return null;
  const kalan = (parseFloat(paket.ucret) - parseFloat(paket.odenen_tutar));
  const tahsilEt = async (e) => { e.preventDefault(); setLoading(true); const ek = parseFloat(ekOdeme) || 0; const yeniOdenen = parseFloat(paket.odenen_tutar) + ek; let durum = 'Ödenmedi'; if (yeniOdenen >= paket.ucret) durum = 'Ödendi'; else if (yeniOdenen > 0) durum = 'Kısmi Ödendi'; const { error } = await supabase.from('musteri_paketleri').update({ odenen_tutar: yeniOdenen, odeme_durumu: durum }).eq('id', paket.id); if (!error) { await supabase.from('odeme_hareketleri').insert([{ paket_id: paket.id, musteri_id: musteri.id, tutar: ek }]); onSuccess(); onClose(); setEkOdeme(''); } else alert(error.message); setLoading(false); };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4"><div className="bg-white w-full max-w-sm rounded-2xl p-5">
      <div className="flex justify-between border-b border-slate-100 pb-3"><h2 className="text-[15px] font-extrabold text-slate-900">Ödeme Tahsil Et</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
      <div className="mt-3 space-y-3 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl"><div className="font-extrabold text-[13px] text-slate-900">{musteri?.adi}</div><div className="font-bold text-slate-600">{paket.hizmetler?.adi} - {paket.toplam_seans} seans</div><div className="mt-2 font-extrabold">Toplam: {paket.ucret} TL | Ödenen: {paket.odenen_tutar} TL | <span className={kalan>0?'text-amber-600':'text-emerald-600'}>Kalan: {kalan} TL</span></div></div>
        <form onSubmit={tahsilEt} className="space-y-3"><div><label className="font-extrabold text-slate-900">Ek Tahsilat Tutarı (TL)</label><input type="number" required min="1" max={kalan} value={ekOdeme} onChange={e=>setEkOdeme(e.target.value)} placeholder={`Maks ${kalan} TL`} className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold" /></div><button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-extrabold">{loading?'İşleniyor...':'Tahsilatı Onayla'}</button></form>
      </div>
    </div></div>
  );
}