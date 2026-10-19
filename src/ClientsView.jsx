import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import OdemeModal from './OdemeModal.jsx';
import MusteriDetayModal from './MusteriDetayModal.jsx';
import { Plus, Phone, MessageSquare, Search, X, Trash, CreditCard, Edit } from './Icons.jsx';

export default function ClientsView({ userRole }) {
  const isAdmin = userRole === 'Admin';
  const [musteriler, setMusteriler] = useState([]);
  const [arama, setArama] = useState('');
  const [filter, setFilter] = useState('tumu');
  const [loading, setLoading] = useState(true);
  const [musteriModal, setMusteriModal] = useState(false);
  const [odeme, setOdeme] = useState(null);
  const [detayMusteri, setDetayMusteri] = useState(null);
  const [detayRandevu, setDetayRandevu] = useState(null);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniTel, setYeniTel] = useState('');

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
    await supabase.from('randevular').delete().eq('musteri_id', id);
    if (count === 0) {
      await supabase.from('odeme_hareketleri').delete().eq('musteri_id', id);
      await supabase.from('musteri_paketleri').delete().eq('musteri_id', id);
    } else {
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

  const aktifPaketler = (m) => {
    if (!m.musteri_paketleri) return [];
    return m.musteri_paketleri.filter((p) => p.durum && p.kalan_seans > 0);
  };

  const toplamBorc = (m) => {
    const aktif = aktifPaketler(m);
    return aktif.reduce((s, p) => s + (p.ucret - p.odenen_tutar), 0);
  };

  const filtreli = musteriler.filter((m) => {
    const okArama =
      m.adi.toLowerCase().includes(arama.toLowerCase()) || (m.telefon || '').includes(arama);
    if (!okArama) return false;
    if (filter === 'borclu') return toplamBorc(m) > 0;
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
            const paketler = aktifPaketler(m);
            const toplam = toplamBorc(m);
            return (
              <div
                key={m.id}
                onClick={() => setDetayMusteri(m)}
                className="bg-white p-3 rounded-xl border cursor-pointer hover:border-violet-400 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[13px] text-slate-900">{m.adi}</span>
                      {toplam > 0 && (
                        <span className="text-[9px] font-bold rounded-full bg-rose-100 text-rose-600 px-2 py-0.5">
                          Borçlu
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">{m.telefon || '-'}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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

                {paketler.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {paketler.map((p) => {
                      const borc = p.ucret - p.odenen_tutar;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 flex-wrap"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                              {p.kalan_seans}/{p.toplam_seans} {p.hizmetler?.adi}
                            </span>
                            {borc > 0 && (
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {borc.toLocaleString('tr-TR')} TL borç
                              </span>
                            )}
                          </div>
                          {borc > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOdeme({ paket: p, musteri: { id: m.id, adi: m.adi } });
                              }}
                              className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95"
                            >
                              <CreditCard className="w-3 h-3" />
                              Öde
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {paketler.length > 0 && toplam > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500">Toplam Borç</span>
                    <span className="text-[13px] font-extrabold text-rose-600">
                      {toplam.toLocaleString('tr-TR')} TL
                    </span>
                  </div>
                )}

                <div className="mt-2 text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  Detay için tıklayın
                </div>
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

      {detayMusteri && !detayRandevu && (
        <MusteriDetayModal
          musteri={detayMusteri}
          onClose={() => setDetayMusteri(null)}
          onRandevuClick={(r) => {
            setDetayRandevu(r);
          }}
          onOdemeClick={(paket) => {
            setOdeme({
              paket,
              musteri: { id: detayMusteri.id, adi: detayMusteri.adi },
            });
            setDetayMusteri(null);
          }}
        />
      )}

      {detayRandevu && (
        <RandevuDetayWrapper
          randevu={detayRandevu}
          onClose={() => {
            setDetayRandevu(null);
            setDetayMusteri(null);
          }}
          onSuccess={() => {
            getir();
            setDetayRandevu(null);
            setDetayMusteri(null);
          }}
        />
      )}
    </div>
  );
}

function RandevuDetayWrapper({ randevu, onClose, onSuccess }) {
  const [egitmenler, setEgitmenler] = useState([]);
  useEffect(() => {
    supabase.from('kullanicilar').select('id,adi').order('adi').then(({ data }) => {
      if (data) setEgitmenler(data);
    });
  }, []);
  return (
    <RandevuDetayInline
      randevu={randevu}
      egitmenler={egitmenler}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

import RandevuDetailModal from './RandevuDetailModal.jsx';