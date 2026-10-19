import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Trash, Plus, Phone, MessageSquare } from './Icons.jsx';

export default function RandevuDetailModal({ isOpen, onClose, randevu, onSuccess, egitmenler }) {
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [egitmenId, setEgitmenId] = useState('');
  const [durum, setDurum] = useState('planlandı');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState(null);
  const [grupRandevular, setGrupRandevular] = useState([]);
  const [musteriler, setMusteriler] = useState([]);
  const [yeniMusteriId, setYeniMusteriId] = useState('');

  useEffect(() => {
    if (randevu) {
      const d = new Date(randevu.baslangic_saati);
      setTarih(d.toISOString().split('T')[0]);
      setSaat(d.toTimeString().slice(0, 5));
      setEgitmenId(randevu.egitmen_id);
      setDurum(randevu.durum);
      setHata(null);
      fetchGrup();
      fetchMusteriler();
    }
  }, [randevu]);

  const fetchGrup = async () => {
    if (!randevu) return;
    let q = supabase
      .from('randevular')
      .select('id, musteri_id, durum, musteriler(adi, telefon), hizmetler(adi, tur, katilim_sayisi)');
    if (randevu.grup_id) {
      q = q.eq('grup_id', randevu.grup_id);
    } else {
      q = q
        .eq('egitmen_id', randevu.egitmen_id)
        .eq('hizmet_id', randevu.hizmet_id)
        .gte('baslangic_saati', new Date(new Date(randevu.baslangic_saati).getTime() - 1000).toISOString())
        .lte('baslangic_saati', new Date(new Date(randevu.baslangic_saati).getTime() + 1000).toISOString());
    }
    const { data } = await q;
    if (data) setGrupRandevular(data);
  };
  const fetchMusteriler = async () => {
    const { data } = await supabase.from('musteriler').select('*').order('adi');
    if (data) setMusteriler(data);
  };

  if (!isOpen || !randevu) return null;
  const isGrup = randevu.hizmetler?.tur === 'Grup' || (grupRandevular[0]?.hizmetler?.tur === 'Grup');
  const kapasite = randevu.hizmetler?.katilim_sayisi || grupRandevular[0]?.hizmetler?.katilim_sayisi || 1;

  const guncelle = async () => {
    setLoading(true);
    setHata(null);
    try {
      const origStart = new Date(randevu.baslangic_saati);
      const origEnd = new Date(randevu.bitis_saati);
      const duration = origEnd - origStart;
      const newStart = new Date(`${tarih}T${saat}:00`);
      const newEnd = new Date(newStart.getTime() + duration);
      const { error } = await supabase
        .from('randevular')
        .update({
          baslangic_saati: newStart.toISOString(),
          bitis_saati: newEnd.toISOString(),
          egitmen_id: egitmenId,
          durum,
        })
        .eq('id', randevu.id);
      if (error) throw error;
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tumSeanslariSil = async () => {
    if (!window.confirm('Bu randevuya ait TÜM seanslar silinecek. Tamamlanmış randevulara ait kazanç kayıtları KORUNACAK. Devam edilsin mi?')) return;
    setLoading(true);
    try {
      const ids = grupRandevular.length > 0 ? grupRandevular.map((g) => g.id) : [randevu.id];
      // Tamamlanmamışları sil
      const silinecekIds = grupRandevular.filter((g) => g.durum !== 'tamamlandı').map((g) => g.id);
      if (silinecekIds.length > 0) {
        // Ödeme referanslarını null'la (kazanç korunsun)
        await supabase.from('odeme_hareketleri').update({ paket_id: null }).in('paket_id', []);
        await supabase.from('egitmen_kazanc_hareketleri').update({ randevu_id: null }).in('randevu_id', silinecekIds);
        await supabase.from('randevular').delete().in('id', silinecekIds);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tekSil = async () => {
    if (!window.confirm('Bu katılımcı silinsin mi? Tamamlandı ise hakediş korunacak.')) return;
    setLoading(true);
    try {
      if (randevu.durum !== 'tamamlandı') {
        await supabase.from('egitmen_kazanc_hareketleri').update({ randevu_id: null }).eq('randevu_id', randevu.id);
        await supabase.from('randevular').delete().eq('id', randevu.id);
      } else {
        // Tamamlanmışsa kazancı koru, sadece null'la
        await supabase.from('egitmen_kazanc_hareketleri').update({ randevu_id: null }).eq('randevu_id', randevu.id);
        await supabase.from('randevular').delete().eq('id', randevu.id);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const grubaEkle = async () => {
    if (!yeniMusteriId) return;
    if (grupRandevular.length >= kapasite) { setHata('Kontenjan dolu!'); return; }
    setLoading(true);
    const { error } = await supabase.from('randevular').insert([{
      musteri_id: yeniMusteriId,
      egitmen_id: randevu.egitmen_id,
      hizmet_id: randevu.hizmet_id,
      baslangic_saati: randevu.baslangic_saati,
      bitis_saati: randevu.bitis_saati,
      durum: 'planlandı',
      grup_id: randevu.grup_id,
    }]);
    if (error) setHata(error.message);
    else { setYeniMusteriId(''); fetchGrup(); if (onSuccess) onSuccess(); }
    setLoading(false);
  };

  const whatsapp = (tel, ad) => {
    let c = tel.replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}?text=${encodeURIComponent(`Merhaba ${ad}, Studio G'den yazıyoruz.`)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">
            Randevu Detayı {isGrup ? `• Grup ${grupRandevular.length}/${kapasite}` : ''}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="mt-3 space-y-3 text-xs">
          {hata && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-[11px] font-bold border border-red-100">
              {hata}
            </div>
          )}
          {isGrup && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <div className="font-extrabold text-[12px] text-amber-800 mb-2">
                Katılımcılar ({grupRandevular.length}/{kapasite})
              </div>
              {grupRandevular.map((g) => (
                <div key={g.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="font-bold text-slate-800">{g.musteriler?.adi}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${g.musteriler?.telefon}`} className="w-7 h-7 bg-white border rounded-full flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => whatsapp(g.musteriler?.telefon, g.musteriler?.adi)}
                      className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
                </div>
              ))}
              {grupRandevular.length < kapasite && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={yeniMusteriId}
                    onChange={(e) => setYeniMusteriId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded-lg bg-white font-bold text-[11px]"
                  >
                    <option value="">Müşteri seç</option>
                    {musteriler.map((m) => (
                      <option key={m.id} value={m.id}>{m.adi}</option>
                    ))}
                  </select>
                  <button
                    onClick={grubaEkle}
                    className="px-3 py-1.5 bg-[#5b46f5] text-white rounded-lg font-extrabold text-[11px]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="bg-slate-50 p-3 rounded-xl text-left">
            <div className="font-extrabold text-[14px] text-slate-900">{randevu.musteriler?.adi}</div>
            <div className="font-bold text-slate-600">{randevu.hizmetler?.adi} • {randevu.kullanicilar?.adi}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-extrabold text-slate-900">Tarih</label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-xl bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-900">Saat</label>
              <input
                type="time"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-xl bg-slate-50 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="font-extrabold text-slate-900">Eğitmen</label>
            <select
              value={egitmenId}
              onChange={(e) => setEgitmenId(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
            >
              {egitmenler.map((eg) => (
                <option key={eg.id} value={eg.id}>{eg.adi}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-extrabold text-slate-900">Durum</label>
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
            >
              <option value="planlandı">Planlandı</option>
              <option value="tamamlandı">Tamamlandı</option>
              <option value="iptal edildi">İptal Edildi</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Tamamlandı yapınca seans düşer ve eğitmen kazancı eklenir. Silince kazanç korunur.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            {isGrup ? (
              <button
                onClick={tumSeanslariSil}
                disabled={loading}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-extrabold text-[11px]"
              >
                Tüm Seansları Sil
              </button>
            ) : (
              <button
                onClick={tekSil}
                disabled={loading}
                className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-extrabold"
              >
                Sil
              </button>
            )}
            <button
              onClick={guncelle}
              disabled={loading}
              className="flex-[2] py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold"
            >
              {loading ? 'Kaydediliyor...' : 'Güncelle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}