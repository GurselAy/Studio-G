import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Phone, MessageSquare, Clock, Calendar, Edit } from './Icons.jsx';

const saatFormatla = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const tarihFormatla = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function MusteriDetayModal({ musteri, onClose, onRandevuClick, onOdemeClick }) {
  const [randevular, setRandevular] = useState([]);
  const [paketler, setPaketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aktifTab, setAktifTab] = useState('gelecek');

  useEffect(() => {
    if (!musteri) return;
    verileriGetir();
  }, [musteri]);

  const verileriGetir = async () => {
    setLoading(true);
    const simdi = new Date().toISOString();
    // TÜM randevular (geçmiş + gelecek)
    const { data: rnd } = await supabase
      .from('randevular')
      .select('*, hizmetler(adi, tur, katilim_sayisi), kullanicilar(adi)')
      .eq('musteri_id', musteri.id)
      .order('baslangic_saati', { ascending: false });

    // Aktif paketler
    const { data: pkt } = await supabase
      .from('musteri_paketleri')
      .select('*, hizmetler(adi)')
      .eq('musteri_id', musteri.id)
      .eq('durum', true)
      .order('olusturma_tarihi', { ascending: false });

    setRandevular(rnd || []);
    setPaketler(pkt || []);
    setLoading(false);
  };

  if (!musteri) return null;

  // Randevuları kategorize et
  const simdi = new Date();
  const gelecek = randevular
    .filter((r) => new Date(r.baslangic_saati) >= simdi && r.durum !== 'iptal edildi')
    .sort((a, b) => new Date(a.baslangic_saati) - new Date(b.baslangic_saati));
  const gecmis = randevular
    .filter((r) => new Date(r.baslangic_saati) < simdi || r.durum === 'tamamlandı')
    .sort((a, b) => new Date(b.baslangic_saati) - new Date(a.baslangic_saati))
    .slice(0, 20); // Son 20 randevu

  const gosterilecekRandevular = aktifTab === 'gelecek' ? gelecek : gecmis;

  const durumBadge = (durum) => {
    if (durum === 'tamamlandı') return { text: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' };
    if (durum === 'iptal edildi') return { text: 'İptal', color: 'bg-rose-100 text-rose-700' };
    return { text: 'Planlandı', color: 'bg-indigo-100 text-indigo-700' };
  };

  const wa = (tel) => {
    let c = tel.replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">{musteri.adi}</h2>
            <p className="text-[11px] font-bold text-slate-500">{musteri.telefon || '-'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Hızlı eylemler */}
          <div className="flex gap-2">
            <a
              href={`tel:${musteri.telefon}`}
              className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" /> Ara
            </a>
            <button
              onClick={() => wa(musteri.telefon)}
              className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </div>

          {/* Aktif Paketler */}
          {paketler.length > 0 && (
            <div>
              <h3 className="text-[12px] font-extrabold text-slate-900 mb-2 uppercase tracking-wider">Aktif Paketler</h3>
              <div className="space-y-2">
                {paketler.map((p) => {
                  const borc = p.ucret - p.odenen_tutar;
                  return (
                    <div key={p.id} className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-[12px] text-slate-900">
                            {p.hizmetler?.adi || 'Hizmet'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {p.kalan_seans}/{p.toplam_seans} seans kaldı
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-[12px] text-slate-900">
                            {parseFloat(p.odenen_tutar || 0).toLocaleString('tr-TR')} / {parseFloat(p.ucret || 0).toLocaleString('tr-TR')} TL
                          </div>
                          {borc > 0 && (
                            <button
                              onClick={() => onOdemeClick && onOdemeClick(p)}
                              className="mt-1 text-[10px] font-extrabold bg-amber-500 text-white px-2 py-1 rounded-full"
                            >
                              {borc.toLocaleString('tr-TR')} TL Borç (Öde)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Randevular - Tabs */}
          <div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-3">
              <button
                onClick={() => setAktifTab('gelecek')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  aktifTab === 'gelecek' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                Gelecek ({gelecek.length})
              </button>
              <button
                onClick={() => setAktifTab('gecmis')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  aktifTab === 'gecmis' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                Geçmiş ({randevular.length - gelecek.length})
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">Yükleniyor...</div>
            ) : gosterilecekRandevular.length === 0 ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">
                {aktifTab === 'gelecek' ? 'Gelecek randevu yok' : 'Geçmiş randevu yok'}
              </div>
            ) : (
              <div className="space-y-2">
                {gosterilecekRandevular.map((r) => {
                  const badge = durumBadge(r.durum);
                  const isGrup = r.hizmetler?.tur === 'Grup';
                  return (
                    <button
                      key={r.id}
                      onClick={() => onRandevuClick(r)}
                      className="w-full text-left bg-white border border-slate-200 hover:border-violet-400 hover:shadow-md transition rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="font-extrabold text-[12px] text-slate-900">
                              {tarihFormatla(r.baslangic_saati)} • {saatFormatla(r.baslangic_saati)}-{saatFormatla(r.bitis_saati)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500">
                              {r.hizmetler?.adi} {isGrup ? `• Grup ${r.hizmetler?.katilim_sayisi} kişi` : ''} • {r.kullanicilar?.adi?.split(' ')[0]}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}