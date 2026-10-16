// ClientsView.jsx - Müşteri listesi
// - Sadece Admin silebilsin, Eğitmen göremez
// - Filtre: Tümü / Borçlu / Kısmi / Ödenmedi
// - iPhone rakam klavyesi eklendi
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import OdemeModal from './OdemeModal';
import { Plus, Phone, MessageSquare, Search, X, Trash, Package, CreditCard } from './Icons';

export default function ClientsView({ userRole }) {
  const isAdmin = userRole === 'Admin';
  const [musteriler, setMusteriler] = useState([]); const [arama, setArama] = useState(''); const [filter, setFilter] = useState('tumu'); const [loading, setLoading] = useState(true);
  const [musteriModal, setMusteriModal] = useState(false);
  const [odemePaket, setOdemePaket] = useState(null); const [odemeMusteri, setOdemeMusteri] = useState(null);
  const [yeniAd, setYeniAd] = useState(''); const [yeniTel, setYeniTel] = useState('');
  useEffect(() => { getir(); }, []);
  const getir = async () => { setLoading(true); const { data } = await supabase.from('musteriler').select(`id, adi, telefon, musteri_paketleri (id, toplam_seans, kalan_seans, ucret, odenen_tutar, odeme_durumu, durum, hizmetler (adi))`).order('adi'); if (data) setMusteriler(data); setLoading(false); };
  const ekle = async (e) => { e.preventDefault(); const { error } = await supabase.from('musteriler').insert([{ adi: yeniAd, telefon: yeniTel }]); if (!error) { setYeniAd(''); setYeniTel(''); setMusteriModal(false); getir(); } };
  const sil = async (id, ad) => {
    if (!isAdmin) { alert('Sadece yönetici silebilir'); return; }
    if (!confirm(`${ad} silinsin mi?`)) return;
    const { count: completedCount } = await supabase.from('randevular').select('*', { count: 'exact', head: true }).eq('musteri_id', id).eq('durum', 'tamamlandı');
    await supabase.from('randevular').delete().eq('musteri_id', id);
    if (completedCount === 0) {
      await supabase.from('odeme_hareketleri').delete().eq('musteri_id', id);
      await supabase.from('musteri_paketleri').delete().eq('musteri_id', id);
    } else {
      await supabase.from('odeme_hareketleri').update({ paket_id: null, musteri_id: null }).eq('musteri_id', id);
      await supabase.from('egitmen_kazanc_hareketleri').update({ musteri_id: null }).eq('musteri_id', id);
      await supabase.from('musteri_paketleri').delete().eq('musteri_id', id);
    }
    await supabase.from('musteriler').delete().eq('id', id); getir();
  };
  const whatsapp = (tel) => { let c = tel.replace(/\D/g, ''); if (c.startsWith('0')) c = c.substring(1); if (!c.startsWith('90')) c = '90' + c; window.open(`https://wa.me/${c}`, '_blank'); };
  let filtreli = musteriler.filter(m => m.adi.toLowerCase().includes(arama.toLowerCase()) || m.telefon.includes(arama));
  if (filter === 'borclu') filtreli = filtreli.filter(m => m.musteri_paketleri?.some(p => (p.ucret - p.odenen_tutar) > 0));
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b"><div className="flex justify-between items-center mb-3"><div><h1 className="text-[18px] font-extrabold text-slate-900">Müşteriler</h1><p className="text-[11px] font-bold text-slate-500">{filtreli.length} üye</p></div><button onClick={() => setMusteriModal(true)} className="w-9 h-9 bg-[#5b46f5] text-white rounded-full flex items-center justify-center"><Plus className="w-5 h-5" /></button></div><div className="relative mb-2"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input value={arama} onChange={e => setArama(e.target.value)} placeholder="İsim veya telefon ara..." className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold" /></div><div className="flex gap-1.5 overflow-x-auto no-scrollbar"><button onClick={()=>setFilter('tumu')} className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${filter==='tumu'?'bg-slate-900 text-white':'bg-slate-100'}`}>Tümü</button><button onClick={()=>setFilter('borclu')} className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${filter==='borclu'?'bg-amber-600 text-white':'bg-amber-50 text-amber-700'}`}>Borçlu</button></div></div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">{loading ? <div className="text-center py-10 text-xs font-bold">Yükleniyor</div> : filtreli.map(m => { const aktif = m.musteri_paketleri?.find(p => p.durum && p.kalan_seans>0); return (<div key={m.id} className="bg-white p-2.5 rounded-xl border flex justify-between items-center"><div className="text-left"><div className="text-[13px] font-extrabold text-slate-900">{m.adi}</div><div className="text-[10px] font-bold text-slate-600">{m.telefon}</div>{aktif && <div className="text-[10px] font-bold mt-1"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"><Package className="w-3 h-3 inline" />{aktif.kalan_seans}/{aktif.toplam_seans}</span> {aktif.ucret-aktif.odenen_tutar>0 && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full ml-1">{aktif.ucret-aktif.odenen_tutar} TL borç</span>}</div>}</div><div className="flex gap-1"><button onClick={()=>whatsapp(m.telefon)} className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /></button><a href={`tel:${m.telefon}`} className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center"><Phone className="w-3.5 h-3.5" /></a>{isAdmin && <button onClick={()=>sil(m.id,m.adi)} className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center"><Trash className="w-3.5 h-3.5 text-red-500" /></button>}</div></div>); })}</div>
      {musteriModal && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-2xl p-5"><div className="flex justify-between border-b pb-3"><h2 className="text-[15px] font-extrabold text-slate-900">Yeni Müşteri Ekle</h2><button onClick={()=>setMusteriModal(false)}><X className="w-5 h-5" /></button></div><form onSubmit={ekle} className="mt-3 space-y-3"><input required placeholder="Ad Soyad" value={yeniAd} onChange={e=>setYeniAd(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm" /><input required type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="Telefon 05xx" value={yeniTel} onChange={e=>setYeniTel(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm" /><button type="submit" className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold">Kaydet</button></form></div></div>}
      <OdemeModal isOpen={Boolean(odemePaket)} onClose={()=>setOdemePaket(null)} paket={odemePaket} musteri={odemeMusteri} onSuccess={getir} />
    </div>
  );
}