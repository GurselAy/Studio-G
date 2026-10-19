import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import OdemeModal from './OdemeModal.jsx';
import { Plus, Phone, MessageSquare, Search, X, Trash, CreditCard } from './Icons.jsx';

export default function ClientsView({ userRole }) {
  const isAdmin = userRole === 'Admin';
  const [musteriler, setMusteriler] = useState([]);
  const [arama, setArama] = useState('');
  const [filter, setFilter] = useState('tumu');
  const [loading, setLoading] = useState(true);
  const [musteriModal, setMusteriModal] = useState(false);
  
  const [odeme, setOdeme] = useState(null); // { paket, musteri }
  // const [odemePaket, setOdemePaket] = useState(null);
  // const [odemeMusteri, setOdemeMusteri] = useState(null);


  const [yeniAd, setYeniAd] = useState('');
  const [yeniTel, setYeniTel] = useState('');

  const [eAd, setEAd] = useState('');
  const [eTel, setETel] = useState('');

  useEffect(() => { getir(); }, []);

  const getir = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('musteriler')
      .select(`*, musteri_paketleri(*, hizmetler(adi))`)
      .order('adi');
    if (data) setMusteriler(data);
    setLoading(false);
  };

  const ekle = async (e) => {
    e.preventDefault();
    if (!yeniAd || !yeniTel) return;
    await supabase.from('musteriler').insert([{ adi: yeniAd, telefon: yeniTel }]);
    setYeniAd('');
    setYeniTel('');
    setMusteriModal(false);
    getir();
  };

  const sil = async (id, ad) => {
    if (!isAdmin) {
      alert('Sadece yönetici silebilir');
      return;
    }
    if (!confirm(`${ad} silinsin mi?`)) return;
    const { count } = await supabase
      .from('randevular')
      .select('*', { count: 'exact', head: true })
      .eq('musteri_id', id)
      .eq('durum', 'tamamlandı');

    // Önce mevcut randevuları sil
    await supabase.from('randevular').delete().eq('musteri_id', id);

    if (count === 0) {
      // Hiç tamamlanmamış randevu yoksa ödeme ve paketleri de silebiliriz
      await supabase.from('odeme_hareketleri').delete().eq('musteri_id', id);
      await supabase.from('musteri_paketleri').delete().eq('musteri_id', id);
    } else {
      // Tamamlanmış randevu varsa kazanç kayıtlarını koruyalım
      await supabase
        .from('odeme_hareketleri')
        .update({ paket_id: null, musteri_id: null })
        .eq('musteri_id', id);
      await supabase
        .from('egitmen_kazanc_hareketleri')
        .update({ musteri_id: null })
        .eq('musteri_id', id);
      await supabase.from('musteri_paketleri').delete().eq('musteri_id', id);
    }
    await supabase.from('musteriler').delete().eq('id', id);
    getir();
  };

  const wa = (tel) => {
    let c = tel.replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  // Müşterinin toplam borcunu hesapla
  const musteriBorcHesapla = (m) => {
    if (!m.musteri_paketleri) return 0;
    return m.musteri_paketleri.reduce((s, p) => {
      const kalan = Math.max(0, parseFloat(p.ucret || 0) - parseFloat(p.odenen_tutar || 0));
      return s + kalan;
    }, 0);
  };

  // Müşterinin ilk açık paketini bul
  const ilkAcikPaket = (m) => {
    if (!m.musteri_paketleri) return null;
    return m.musteri_paketleri.find((p) => p.durum && p.kalan_seans > 0) || null;
  };

  const filtreli = musteriler.filter((m) => {
    const okArama =
      m.adi.toLowerCase().includes(arama.toLowerCase()) ||
      (m.telefon || '').includes(arama);
    if (!okArama) return false;
    if (filter === 'borclu') return musteriBorcHesapla(m) > 0;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-[18px] font-extrabold text-slate-900">Müşteriler</h1>
            <p className="text-[11px] font-bold text-slate-500">{filtreli.length} üye</p>
          </div>
          <button
            onClick={() => setMusteriModal(true)}
            className="w-9 h-9 bg-[#5b46f5] text-white rounded-full flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="İsim veya telefon ara..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilter('tumu')}
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
              filter === 'tumu' ? 'bg-slate-900 text-white' : 'bg-slate-100'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('borclu')}
            className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
              filter === 'borclu' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700'
            }`}
          >
            Borçlu
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-xs font-bold">Yükleniyor</div>
        ) : filtreli.length === 0 ? (
          <div className="text-center py-10 text-xs font-bold text-slate-400">Müşteri bulunamadı</div>
        ) : (
          filtreli.map((m) => {
            const borc = musteriBorcHesapla(m);
            const aktif = ilkAcikPaket(m);
            return (
              <div
                key={m.id}
                className="bg-white p-3 rounded-xl border flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[13px] text-slate-900">{m.adi}</span>
                      {borc > 0 && (
                        <span className="text-[9px] font-bold rounded-full bg-rose-100 text-rose-600 px-2 py-0.5">
                          Borçlu
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                      {m.telefon || '-'}
                    </div>
                    {aktif && (
                      <div className="text-[10px] font-bold mt-1 text-slate-600">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          {aktif.kalan_seans}/{aktif.toplam_seans} {aktif.hizmetler?.adi}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => wa(m.telefon)}
                      className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <a
                      href={`tel:${m.telefon}`}
                      className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center"
                      title="Ara"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => sil(m.id, m.adi)}
                        className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

      {/* Borç bilgisi ve Ödeme butonu - AKTİF */}
      {borc > 0 && (
        <button
          // onClick={() => {
            // console.log('Borçlu paketler:', m.musteri_paketleri);
            // İlk borçlu paketi bul (herhangi bir hata durumunda alert göster)
            // const borcluPaket = (m.musteri_paketleri || []).find(
             //  (p) => parseFloat(p.ucret || 0) - parseFloat(p.odenen_tutar || 0) > 0
           //  );
           //  if (!borcluPaket) {
            //   alert('Bu müşterinin borçlu paketi bulunamadı');
             //  return;
            // }
           //  console.log('Seçilen paket:', borcluPaket);
           //  setOdemePaket(borcluPaket);
           //  setOdemeMusteri({ id: m.id, adi: m.adi });
          // }}     
          
          onClick={() => {
          const borcluPaket = (m.musteri_paketleri || []).find(
           (p) => parseFloat(p.ucret || 0) - parseFloat(p.odenen_tutar || 0) > 0
          );
          if (!borcluPaket) { alert('Bu müşterinin borçlu paketi bulunamadı'); return; }
          setOdeme({ paket: borcluPaket, musteri: { id: m.id, adi: m.adi } });
      }}

                  className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl hover:bg-amber-100 active:scale-95 transition"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-700" />
                      <span className="text-[12px] font-extrabold text-amber-800">
                        {borc.toLocaleString('tr-TR')} TL Borç
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold bg-amber-600 text-white px-2.5 py-1 rounded-full">
                      Ödeme Tahsil Et →
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {musteriModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] font-extrabold">Yeni Müşteri Ekle</h2>
              <button onClick={() => setMusteriModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={ekle} className="mt-3 space-y-3">
              <input
                required
                placeholder="Ad Soyad"
                value={yeniAd}
                onChange={(e) => setYeniAd(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
              />
              <input
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Telefon 05xx (numeric)"
                value={yeniTel}
                onChange={(e) => setYeniTel(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
              />
              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {odeme && (
        <OdemeModal
          paket={odeme.paket}
          musteri={odeme.musteri}
          onClose={() => setOdeme(null)}
          onSuccess={getir}
        />
      )}
    </div>
  );
}