// AjandaView.jsx
// - Tamamlanan ve iptal dahil TÜM randevular görünür, geri alınabilir
// - Bireysel: Ad solda, Ara/WhatsApp sağda aynı satır
// - Grup: Katılımcılar alt alta, her satırda telefon/whatsapp
// - Yükseklik kompakt, sola dayalı
import React, { useRef, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Phone, MessageSquare, Clock, Search, CreditCard } from './Icons';
import OdemeModal from './OdemeModal';

export default function AjandaView({ secilenTarih, setSecilenTarih, secilenEgitmen, setSecilenEgitmen, egitmenler, randevular, loading, veriGetir, onRandevuClick }) {
  const [arama, setArama] = useState('');
  const [paketMap, setPaketMap] = useState({});
  const [odemePaket, setOdemePaket] = useState(null);
  const [odemeMusteri, setOdemeMusteri] = useState(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const onTouchStart = (e) => touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy)) return;
    const d = new Date(secilenTarih);
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    setSecilenTarih(d.toISOString().split('T')[0]);
  };

  useEffect(() => { fetchPaketler(); }, [randevular]);
  const fetchPaketler = async () => {
    if (randevular.length === 0) return;
    const ids = [...new Set(randevular.map(r => r.musteri_id))];
    const { data } = await supabase.from('musteri_paketleri').select('*, hizmetler(adi)').in('musteri_id', ids).eq('durum', true).gt('kalan_seans', 0);
    const map = {}; (data || []).forEach(p => { if (!map[p.musteri_id]) map[p.musteri_id] = p; });
    setPaketMap(map);
  };

  const saatFormatla = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const whatsapp = (tel, ad) => { let c = tel.replace(/\D/g, ''); if (c.startsWith('0')) c = c.substring(1); if (!c.startsWith('90')) c = '90' + c; window.open(`https://wa.me/${c}?text=${encodeURIComponent(`Merhaba ${ad}, Studio G`)}`, '_blank'); };
  const durumGuncelle = async (id, yeniDurum, e) => { e.stopPropagation(); await supabase.from('randevular').update({ durum: yeniDurum }).eq('id', id); veriGetir(); };

  const grouped = {};
  randevular.forEach(r => {
    const key = `${r.egitmen_id}_${new Date(r.baslangic_saati).getTime()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });
  let list = Object.values(grouped);
  if (arama) {
    const q = arama.toLowerCase();
    list = list.filter(g => g.some(r => r.musteriler?.adi?.toLowerCase().includes(q) || r.musteriler?.telefon?.includes(q)));
  }
  const colors = ['#2563eb','#16a34a','#c026d3','#f97316','#0891b2','#7c3aed'];

  return (
    <div className="flex flex-col h-full bg-[#f8f7ff]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="bg-white p-2 border-b space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setSecilenEgitmen('tumu')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${secilenEgitmen === 'tumu' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Tümü</button>
          {egitmenler.map(egt => <button key={egt.id} onClick={() => setSecilenEgitmen(egt.id)} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${secilenEgitmen === egt.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{egt.adi}</button>)}
        </div>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input value={arama} onChange={e => setArama(e.target.value)} placeholder="Üye veya telefon ara..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold" /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {loading ? <div className="text-center py-10 text-xs font-bold">Yükleniyor...</div> : list.length === 0 ? <div className="text-center py-16 text-xs font-bold text-slate-400">Randevu yok</div> : list.map((group) => {
          const first = group[0];
          const isGrup = first.hizmetler?.tur === 'Grup';
          const kapasite = first.hizmetler?.katilim_sayisi || 1;
          const paket = paketMap[first.musteri_id];
          const borc = paket ? (paket.ucret - paket.odenen_tutar) : 0;
          const isTamamlandi = first.durum === 'tamamlandı';
          return (
            <div key={first.id} className={`bg-white rounded-xl p-2.5 shadow-sm border ${isTamamlandi ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${isTamamlandi ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}><Clock className="w-3 h-3" />{saatFormatla(first.baslangic_saati)} - {saatFormatla(first.bitis_saati)} {isGrup ? `• ${group.length}/${kapasite}` : ''}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: colors[egitmenler.findIndex(e => e.id === first.egitmen_id) % colors.length] || '#6366f1' }}>{first.kullanicilar?.adi?.split(' ')[0]}</span>
                  <select value={first.durum} onClick={e => e.stopPropagation()} onChange={e => durumGuncelle(first.id, e.target.value, e)} className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border-0 ${first.durum === 'tamamlandı' ? 'bg-emerald-100 text-emerald-800' : first.durum === 'iptal edildi' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-700'}`}><option value="planlandı">Planlandı</option><option value="tamamlandı">Tamamlandı</option><option value="iptal edildi">İptal</option></select>
                </div>
              </div>

              <div className="mt-2 text-left">
                {isGrup ? (
                  <div className="space-y-1">{group.map(r => (<div key={r.id} className="flex justify-between items-center"><span className={`text-[12px] font-extrabold text-left ${isTamamlandi ? 'line-through text-slate-500' : 'text-slate-900'}`}>{r.musteriler?.adi}</span><div className="flex gap-1"><a href={`tel:${r.musteriler?.telefon}`} onClick={e => e.stopPropagation()} className="w-6 h-6 bg-slate-50 border rounded-full flex items-center justify-center"><Phone className="w-3 h-3" /></a><button onClick={(e) => { e.stopPropagation(); whatsapp(r.musteriler?.telefon, r.musteriler?.adi) }} className="w-6 h-6 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"><MessageSquare className="w-3 h-3 text-emerald-600" /></button></div></div>))}</div>
                ) : (
                  <div className="flex justify-between items-center"><span className={`text-[13px] font-extrabold text-left ${isTamamlandi ? 'line-through text-slate-500' : 'text-slate-900'}`}>{first.musteriler?.adi}</span><div className="flex gap-1"><a href={`tel:${first.musteriler?.telefon}`} onClick={e => e.stopPropagation()} className="w-7 h-7 bg-slate-50 border rounded-full flex items-center justify-center"><Phone className="w-3.5 h-3.5" /></a><button onClick={(e) => { e.stopPropagation(); whatsapp(first.musteriler?.telefon, first.musteriler?.adi) }} className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /></button></div></div>
                )}
                <div className="text-[10px] font-bold text-slate-500 text-left mt-1">{first.hizmetler?.adi} {isGrup ? `• Grup • ${group.length}/${kapasite} kişi` : '• Bireysel'}</div>
              </div>

              <div className="mt-2 flex justify-between items-center">
                <div>{paket && borc > 0 && (<button onClick={(e) => { e.stopPropagation(); setOdemePaket(paket); setOdemeMusteri({ id: first.musteri_id, adi: first.musteriler?.adi }) }} className="text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1"><CreditCard className="w-3 h-3" />{borc} TL Alacak</button>)}</div>
                <button onClick={() => onRandevuClick(first)} className="text-[10px] font-extrabold bg-white border px-3 py-1 rounded-full">Detay →</button>
              </div>
            </div>
          );
        })}
      </div>
      <OdemeModal isOpen={Boolean(odemePaket)} onClose={() => setOdemePaket(null)} paket={odemePaket} musteri={odemeMusteri} onSuccess={() => { setOdemePaket(null); veriGetir(); }} />
    </div>
  );
}