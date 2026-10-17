// NewAppointmentModal.jsx
// - Bireysel: tek müşteri, çakışma kontrolü: eğitmen ve müşteri aynı saatte başka yerde olamaz
// - Grup: çoklu müşteri seçme, kapasite kontrolü, kişi başı paket ücreti
// - Eğitmen seans ücreti: tamamlandığında hakedişe eklenir
// - crypto.randomUUID fallback eklendi (http için)
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { X, Package, Plus, Trash } from './Icons';

function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; const v = c==='x'?r:(r&0x3|0x8); return v.toString(16); });
}

export default function NewAppointmentModal({ isOpen, onClose, onSuccess, secilenTarih }) {
  const [musteriler, setMusteriler] = useState([]); const [hizmetler, setHizmetler] = useState([]); const [egitmenler, setEgitmenler] = useState([]);
  const [secilenMusteri, setSecilenMusteri] = useState(''); const [secilenGrupMusteriler, setSecilenGrupMusteriler] = useState([]);
  const [yeniMusteriModu, setYeniMusteriModu] = useState(false); const [yeniMusteriAdi, setYeniMusteriAdi] = useState(''); const [yeniMusteriTel, setYeniMusteriTel] = useState('');
  const [secilenHizmet, setSecilenHizmet] = useState(''); const [secilenEgitmen, setSecilenEgitmen] = useState('');
  const [tarih, setTarih] = useState(secilenTarih); const [saat, setSaat] = useState('10:00');
  const [seansSayisi, setSeansSayisi] = useState(8); const [paketUcreti, setPaketUcreti] = useState(''); const [tahsilEdilen, setTahsilEdilen] = useState(''); const [egitmenUcret, setEgitmenUcret] = useState('');
  const [mevcutPaket, setMevcutPaket] = useState(null); const [loading, setLoading] = useState(false); const [hata, setHata] = useState(null);

  useEffect(() => { if (isOpen) { setTarih(secilenTarih); setSecilenGrupMusteriler([]); formVerileriniGetir(); } }, [isOpen, secilenTarih]);
  useEffect(() => { if (secilenMusteri && secilenHizmet && !yeniMusteriModu) aktifPaketKontrol(secilenMusteri, secilenHizmet); }, [secilenMusteri, secilenHizmet]);

  const formVerileriniGetir = async () => {
    const { data: m } = await supabase.from('musteriler').select('id, adi').order('adi'); if (m) setMusteriler(m);
    const { data: h } = await supabase.from('hizmetler').select('id, adi, sure, tur, katilim_sayisi'); if (h) { setHizmetler(h); if (!secilenHizmet) setSecilenHizmet(h[0].id); }
    const { data: e } = await supabase.from('kullanicilar').select('id, adi'); if (e) { setEgitmenler(e); if (!secilenEgitmen) setSecilenEgitmen(e[0].id); }
  };
  const aktifPaketKontrol = async (musteriId, hizmetId) => {
    const { data } = await supabase.from('musteri_paketleri').select('*').eq('musteri_id', musteriId).eq('hizmet_id', hizmetId).eq('durum', true).gt('kalan_seans', 0).limit(1).maybeSingle();
    setMevcutPaket(data || null);
  };

  const hizmetDetay = hizmetler.find(h=>h.id===secilenHizmet);
  const isGrup = hizmetDetay?.tur === 'Grup';
  const kapasite = hizmetDetay?.katilim_sayisi || 1;

  const grubaEkle = () => {
    if (!secilenMusteri) return;
    if (secilenGrupMusteriler.includes(secilenMusteri)) return;
    if (secilenGrupMusteriler.length >= kapasite) { setHata(`Kontenjan dolu (${kapasite} kişi)`); return; }
    setSecilenGrupMusteriler([...secilenGrupMusteriler, secilenMusteri]);
    setSecilenMusteri('');
  };
  const gruptanCikar = (id) => setSecilenGrupMusteriler(secilenGrupMusteriler.filter(x=>x!==id));

  const kaydet = async (e) => {
    e.preventDefault(); setLoading(true); setHata(null);
    try {
      let musteriIds = [];
      if (isGrup) {
        musteriIds = [...secilenGrupMusteriler];
        if (yeniMusteriModu) {
          if (!yeniMusteriAdi || !yeniMusteriTel) throw new Error('Müşteri adı ve telefonu zorunlu');
          const { data, error } = await supabase.from('musteriler').insert([{ adi: yeniMusteriAdi, telefon: yeniMusteriTel }]).select().single();
          if (error) throw error; musteriIds.push(data.id);
        }
        if (musteriIds.length === 0) throw new Error('Grup için en az 1 müşteri seçin');
      } else {
        let mid = secilenMusteri;
        if (yeniMusteriModu) {
          if (!yeniMusteriAdi || !yeniMusteriTel) throw new Error('Müşteri bilgileri zorunlu');
          const { data, error } = await supabase.from('musteriler').insert([{ adi: yeniMusteriAdi, telefon: yeniMusteriTel }]).select().single();
          if (error) throw error; mid = data.id;
        }
        if (!mid) throw new Error('Müşteri seçin');
        musteriIds = [mid];
      }

      const sure = hizmetDetay?.sure || 50; const toplam = parseInt(seansSayisi) || 1;
      const proposed = [];
      for (let i = 0; i < toplam; i++) {
        const bas = new Date(`${tarih}T${saat}:00`); bas.setDate(bas.getDate() + (i * 7));
        const bit = new Date(bas.getTime() + sure * 60000);
        proposed.push({ start: bas, end: bit });
      }

      // Çakışma kontrolü: Eğitmen + Müşteri
      for (const p of proposed) {
        // Eğitmen doluluk
        const { data: trainerBusy } = await supabase.from('randevular').select('id').eq('egitmen_id', secilenEgitmen).gte('baslangic_saati', new Date(p.start.getTime()-1000).toISOString()).lte('baslangic_saati', new Date(p.start.getTime()+1000).toISOString());
        if (trainerBusy) {
          if (!isGrup && trainerBusy.length >= 1) throw new Error(`Eğitmen ${p.start.toLocaleDateString('tr-TR')} ${p.start.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})} tarihinde dolu`);
          if (isGrup && trainerBusy.length + musteriIds.length > kapasite) throw new Error(`Grup kontenjanı dolu! Mevcut ${trainerBusy.length}/${kapasite}, eklemek istediğin ${musteriIds.length} kişi`);
        }
        // Müşteri çakışma: aynı müşteri aynı saatte başka eğitmende olamaz
        for (const mid of musteriIds) {
          const { data: customerBusy } = await supabase.from('randevular').select('id, kullanicilar(adi)').eq('musteri_id', mid).gte('baslangic_saati', new Date(p.start.getTime()-1000).toISOString()).lte('baslangic_saati', new Date(p.start.getTime()+1000).toISOString());
          if (customerBusy && customerBusy.length > 0) {
            const mAdi = musteriler.find(m=>m.id===mid)?.adi || 'Müşteri';
            throw new Error(`${mAdi} için ${p.start.toLocaleDateString('tr-TR')} ${p.start.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})} tarihinde zaten randevu var (başka eğitmenle)`);
          }
        }
      }

      // Paket oluşturma (kişi başı)
      for (const mid of musteriIds) {
        if (!isGrup) {
          if (mevcutPaket && musteriIds[0]===mid) continue; // bireyselde paketi varsa atla
        }
        // grupta her müşteri için paket kontrolü
        const { data: existingPaket } = await supabase.from('musteri_paketleri').select('id').eq('musteri_id', mid).eq('hizmet_id', secilenHizmet).eq('durum', true).gt('kalan_seans',0).limit(1).maybeSingle();
        if (existingPaket) continue;

        if (!paketUcreti) throw new Error('Paket fiyatı girilmeli');
        const ucret = parseFloat(paketUcreti) || 0; const odenen = parseFloat(tahsilEdilen) || 0;
        let durum = 'Ödenmedi'; if (odenen >= ucret && ucret>0) durum='Ödendi'; else if (odenen>0) durum='Kısmi Ödendi';
        const { data: paket, error } = await supabase.from('musteri_paketleri').insert([{ musteri_id: mid, hizmet_id: secilenHizmet, toplam_seans: toplam, kalan_seans: toplam, ucret, odenen_tutar: odenen, odeme_durumu: durum, durum: true }]).select().single();
        if (error) throw error;
        if (odenen>0) await supabase.from('odeme_hareketleri').insert([{ paket_id: paket.id, musteri_id: mid, tutar: odenen }]);
      }

      // Randevuları oluştur
      const insertList = [];
      for (let i=0;i<proposed.length;i++) {
        const p = proposed[i];
        const grupId = genUUID();
        for (const mid of musteriIds) {
          insertList.push({ musteri_id: mid, egitmen_id: secilenEgitmen, hizmet_id: secilenHizmet, baslangic_saati: p.start.toISOString(), bitis_saati: p.end.toISOString(), durum: 'planlandı', yinelenen: toplam>1, tekrar_sayisi: toplam>1?toplam:null, tekrar_araligi: toplam>1?'Hafta':null, egitmen_ucret: parseFloat(egitmenUcret)||0, grup_id: grupId });
        }
      }
      const { error } = await supabase.from('randevular').insert(insertList); if (error) throw error;
      onSuccess(); onClose();
    } catch (err) { setHata(err.message); } finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100"><h2 className="text-[15px] font-extrabold text-slate-900">Yeni Randevu & Paket</h2><button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button></div>
        {hata && <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100">{hata}</div>}
        <form onSubmit={kaydet} className="mt-3 space-y-3">
          <div><label className="text-xs font-extrabold text-slate-900">Ders / Hizmet</label><select value={secilenHizmet} onChange={e=>setSecilenHizmet(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold">{hizmetler.map(h=><option key={h.id} value={h.id}>{h.adi} ({h.sure} dk) {h.tur==='Grup'?`• Grup ${h.katilim_sayisi} kişi`:''}</option>)}</select>{isGrup && <p className="text-[10px] font-bold text-amber-600 mt-1">Grup: Kontenjan {kapasite} kişi, ücret kişi başı</p>}</div>

          <div>
            <div className="flex justify-between mb-1"><label className="text-xs font-extrabold text-slate-900">Müşteri {isGrup ? `(${secilenGrupMusteriler.length}/${kapasite})` : ''}</label><button type="button" onClick={()=>setYeniMusteriModu(!yeniMusteriModu)} className="text-[11px] font-bold text-[#5b46f5]">{yeniMusteriModu?'Listeden Seç':'+ Yeni Müşteri'}</button></div>
            {yeniMusteriModu ? <div className="space-y-2 bg-slate-50 p-2 rounded-xl"><input value={yeniMusteriAdi} onChange={e=>setYeniMusteriAdi(e.target.value)} placeholder="Ad Soyad" className="w-full px-3 py-2.5 text-xs border rounded-xl font-bold" /><input value={yeniMusteriTel} onChange={e=>setYeniMusteriTel(e.target.value)} placeholder="05xx" className="w-full px-3 py-2.5 text-xs border rounded-xl font-bold" /></div> : (
              <div className="flex gap-2">
                <select value={secilenMusteri} onChange={e=>setSecilenMusteri(e.target.value)} className="flex-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"><option value="">Seçin</option>{musteriler.filter(m=>!secilenGrupMusteriler.includes(m.id)).map(m=><option key={m.id} value={m.id}>{m.adi}</option>)}</select>
                {isGrup && <button type="button" onClick={grubaEkle} className="px-3 py-2 bg-[#5b46f5] text-white rounded-xl"><Plus className="w-4 h-4" /></button>}
              </div>
            )}
            {isGrup && secilenGrupMusteriler.length>0 && <div className="mt-2 space-y-1">{secilenGrupMusteriler.map(id=>{ const m = musteriler.find(x=>x.id===id); return <div key={id} className="flex justify-between items-center bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold"><span>{m?.adi}</span><button type="button" onClick={()=>gruptanCikar(id)}><Trash className="w-3.5 h-3.5 text-red-500" /></button></div>})}</div>}
            {!isGrup && mevcutPaket && <div className="mt-2 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex justify-between"><span className="text-xs font-extrabold text-emerald-800 flex gap-1"><Package className="w-4 h-4"/>Kalan: {mevcutPaket.kalan_seans}/{mevcutPaket.toplam_seans}</span><span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded shadow">Paketten</span></div>}
          </div>

          <div><label className="text-xs font-extrabold text-slate-900">Eğitmen</label><select value={secilenEgitmen} onChange={e=>setSecilenEgitmen(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold">{egitmenler.map(egt=><option key={egt.id} value={egt.id}>{egt.adi}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-extrabold text-slate-900">Tarih</label><input type="date" value={tarih} onChange={e=>setTarih(e.target.value)} className="w-full mt-1 px-2 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold" /></div><div><label className="text-xs font-extrabold text-slate-900">Saat</label><input type="time" value={saat} onChange={e=>setSaat(e.target.value)} className="w-full mt-1 px-2 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold" /></div></div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
            <div><label className="text-[11px] font-extrabold text-slate-900">Toplam Seans Sayısı</label><input type="number" required min="1" max="50" value={seansSayisi} onChange={e=>setSeansSayisi(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border rounded-xl text-xs font-extrabold" /></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="text-[11px] font-extrabold text-slate-900">Paket Fiyatı (TL) {isGrup ? 'Kişi Başı *' : '*'}</label><input type="tel" inputMode="numeric" pattern="[0-9]*" required placeholder="8000" value={paketUcreti} onChange={e=>setPaketUcreti(e.target.value)} className="w-full mt-1 px-2 py-2 bg-white border rounded-xl text-xs font-bold" /></div><div><label className="text-[11px] font-extrabold text-slate-900">Tahsil Edilen {isGrup ? 'Kişi Başı' : ''}</label><input type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="8000" value={tahsilEdilen} onChange={e=>setTahsilEdilen(e.target.value)} className="w-full mt-1 px-2 py-2 bg-white border rounded-xl text-xs font-bold" /></div></div>
            <div><label className="text-[11px] font-extrabold text-slate-900">Eğitmen Seans Ücreti (TL)</label><input type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="500" value={egitmenUcret} onChange={e=>setEgitmenUcret(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border rounded-xl text-xs font-bold" /><p className="text-[10px] font-medium text-slate-500 mt-1">Tamamlandığında eğitmenin kazancına eklenir</p></div>
            <p className="text-[10px] font-bold text-indigo-700 bg-white p-2 rounded-lg border">Not: Önümüzdeki {seansSayisi} hafta boyunca her {new Date(tarih).toLocaleDateString('tr-TR',{weekday:'long'})} saat {saat}'e tüm seanslar oluşturulacak.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-[#5b46f5] text-white rounded-xl text-xs font-extrabold shadow">{loading?'Kaydediliyor...':`${seansSayisi} Seanslık ${isGrup ? `Grup (${secilenGrupMusteriler.length || 1} kişi)` : 'Paket'} Oluştur`}</button>
        </form>
      </div>
    </div>
  );
}