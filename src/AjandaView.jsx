import React, { useRef, useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import { Phone, MessageSquare, Clock, Search, CreditCard } from './Icons.jsx';
import OdemeModal from './OdemeModal.jsx';

export default function AjandaView({ secilenTarih, setSecilenTarih, secilenEgitmen, setSecilenEgitmen, egitmenler, userId, userRole, onRandevuClick }) {
  const [arama, setArama] = useState('');
  const [paketMap, setPaketMap] = useState({});
  const [odeme, setOdeme] = useState(null); // { paket, musteri }
  const [randevular, setRandevular] = useState([]);
  const [loading, setLoading] = useState(true);

  const touch = useRef({ x: 0, y: 0 });
  const onStart = (e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy)) return;
    const d = new Date(secilenTarih + 'T12:00:00');
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    setSecilenTarih(d.toISOString().slice(0, 10));
  };

  useEffect(() => {
    randevulariGetir();
  }, [secilenTarih, secilenEgitmen, userId, userRole]);

  const randevulariGetir = async () => {
    setLoading(true);
    let q = supabase
      .from('randevular')
      .select('id, musteri_id, hizmet_id, egitmen_id, baslangic_saati, bitis_saati, durum, grup_id, musteriler(adi, telefon), hizmetler(adi, tur, katilim_sayisi), kullanicilar(adi)')
      .gte('baslangic_saati', secilenTarih + 'T00:00:00')
      .lte('baslangic_saati', secilenTarih + 'T23:59:59')
      .order('baslangic_saati');

    // Eğitmen ise sadece kendi seansları
    if (userRole === 'Eğitmen' && userId) {
      q = q.eq('egitmen_id', userId);
    } else if (secilenEgitmen && secilenEgitmen !== 'tumu') {
      // Admin için manuel seçim
      q = q.eq('egitmen_id', secilenEgitmen);
    }

    const { data } = await q;
    if (data) setRandevular(data);
    setLoading(false);

    // Paketleri çek (müşterilerin borçları için)
    if (data && data.length > 0) {
      const musteriIds = [...new Set(data.map((r) => r.musteri_id))];
      const { data: paketler } = await supabase
        .from('musteri_paketleri')
        .select('musteri_id, id, toplam_seans, kalan_seans, ucret, odenen_tutar, durum, hizmetler(adi)')
        .in('musteri_id', musteriIds)
        .eq('durum', true)
        .gt('kalan_seans', 0);
      const map = {};
      (paketler || []).forEach((p) => {
        if (!map[p.musteri_id]) map[p.musteri_id] = [];
        map[p.musteri_id].push(p);
      });
      setPaketMap(map);
    } else {
      setPaketMap({});
    }
  };

  const saatFormatla = (t) => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const wa = (tel) => {
    let c = tel.replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  const durumGuncelle = async (id, yeni, e) => {
    e.stopPropagation();
    await supabase.from('randevular').update({ durum: yeni }).eq('id', id);
    randevulariGetir();
  };

  // Tüm Seansları Sil (Ajanda detayından)
  const tumSeanslariSil = async (randevu, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Bu randevuya ait TÜM seanslar silinecek. Tamamlanmış seansların hakedişi korunur. Devam edilsin mi?')) return;
    try {
      const ids = randevu.grup_id
        ? (await supabase.from('randevular').select('id').eq('grup_id', randevu.grup_id)).data?.map((r) => r.id) || [randevu.id]
        : [randevu.id];

      // Tamamlanmamış seansları bul
      const silinecekIds = (await supabase
        .from('randevular')
        .select('id, durum')
        .in('id', ids)).data?.filter((r) => r.durum !== 'tamamlandı').map((r) => r.id) || [];

      if (silinecekIds.length > 0) {
        // Ödeme referanslarını koru (müşteri_id null yapma — sadece referansı kaldır)
        // Kazanç kayıtlarında referansı null'la
        await supabase
          .from('egitmen_kazanc_hareketleri')
          .update({ randevu_id: null })
          .in('randevu_id', silinecekIds);
        // Randevuları sil
        await supabase.from('randevular').delete().in('id', silinecekIds);
      }
      randevulariGetir();
    } catch (err) {
      alert('Hata: ' + err.message);
    }
  };

  // Grupla (grup_id bazlı)
  const grouped = useMemo(() => {
    const g = {};
    randevular.forEach((r) => {
      const k = r.grup_id || `tek_${r.id}`;
      if (!g[k]) g[k] = [];
      g[k].push(r);
    });
    return Object.values(g);
  }, [randevular]);

  const list = useMemo(() => {
    let l = grouped;
    if (arama) {
      const q = arama.toLowerCase();
      l = l.filter((g) =>
        g.some(
          (r) =>
            (r.musteriler?.adi || '').toLowerCase().includes(q) ||
            (r.musteriler?.telefon || '').includes(arama),
        ),
      );
    }
    return l;
  }, [grouped, arama]);

  const colors = ['#2563eb', '#16a34a', '#c026d3', '#f97316', '#0891b2', '#7c3aed'];

  return (
    <div className="flex flex-col h-full bg-[#f8f7ff]" onTouchStart={onStart} onTouchEnd={onEnd}>
      {/* Eğitmen filtresi - sadece Admin için göster */}
      {userRole === 'Admin' && (
        <div className="bg-white p-2 border-b">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSecilenEgitmen('tumu')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                secilenEgitmen === 'tumu' ? 'bg-slate-900 text-white' : 'bg-slate-100'
              }`}
            >
              Tümü
            </button>
            {egitmenler.map((e) => (
              <button
                key={e.id}
                onClick={() => setSecilenEgitmen(e.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                  secilenEgitmen === e.id ? 'bg-indigo-600 text-white' : 'bg-slate-100'
                }`}
              >
                {e.adi}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-2 border-b">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Üye veya telefon ara..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-xs font-bold">Yükleniyor</div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-xs font-bold text-slate-400">Randevu yok</div>
        ) : (
          list.map((g) => {
            const f = g[0];
            const isGrup = f.hizmetler?.tur === 'Grup';
            const cap = f.hizmetler?.katilim_sayisi || 1;
            const paketler = paketMap[f.musteri_id] || [];
            const aktifPaket = paketler[0];
            const borc = aktifPaket ? aktifPaket.ucret - aktifPaket.odenen_tutar : 0;
            const isTamam = f.durum === 'tamamlandı';

            return (
              <div
                key={f.grup_id || f.id}
                className={`bg-white rounded-xl p-2.5 shadow-sm border ${
                  isTamam ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                    isTamam ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {saatFormatla(f.baslangic_saati)} - {saatFormatla(f.bitis_saati)}
                    {isGrup ? ` • ${g.length}/${cap}` : ''}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span
                      className="text-[9px] font-extrabold text-white px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors[egitmenler.findIndex((e) => e.id === f.egitmen_id) % colors.length] || '#6366f1' }}
                    >
                      {f.kullanicilar?.adi?.split(' ')[0]}
                    </span>
                    <select
                      value={f.durum}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => durumGuncelle(f.id, e.target.value, e)}
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border-0 ${
                        f.durum === 'tamamlandı' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      <option value="planlandı">Planlandı</option>
                      <option value="tamamlandı">Tamamlandı</option>
                      <option value="iptal edildi">İptal</option>
                    </select>
                  </div>
                </div>

                <div className="mt-2 text-left">
                  {isGrup ? (
                    <div className="space-y-1">
                      {g.map((r) => (
                        <div key={r.id} className="flex justify-between items-center">
                          <span className={`text-[12px] font-extrabold ${
                            isTamam ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}>
                            {r.musteriler?.adi}
                          </span>
                          <div className="flex gap-1">
                            <a
                              href={`tel:${r.musteriler?.telefon}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 bg-slate-50 border rounded-full flex items-center justify-center"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <button
                              onClick={(e) => { e.stopPropagation(); wa(r.musteriler?.telefon); }}
                              className="w-6 h-6 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className={`text-[13px] font-extrabold ${
                        isTamam ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}>
                        {f.musteriler?.adi}
                      </span>
                      <div className="flex gap-1">
                        <a
                          href={`tel:${f.musteriler?.telefon}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-7 h-7 bg-slate-50 border rounded-full flex items-center justify-center"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); wa(f.musteriler?.telefon); }}
                          className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-slate-500 mt-1">
                    {f.hizmetler?.adi} {isGrup ? `• Grup ${g.length}/${cap} kişi` : '• Bireysel'}
                  </div>
                </div>

                <div className="mt-2 flex justify-between items-center gap-2">
                  <div>
                    {aktifPaket && borc > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOdeme({
                            paket: aktifPaket,
                            musteri: { id: f.musteri_id, adi: f.musteriler?.adi },
                          });
                        }}
                        className="text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1"
                      >
                        <CreditCard className="w-3 h-3" />
                        {borc} TL Alacak
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isGrup && (
                      <button
                        onClick={(e) => tumSeanslariSil(f, e)}
                        className="text-[10px] font-extrabold bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full"
                      >
                        Tümünü Sil
                      </button>
                    )}
                    <button
                      onClick={() => onRandevuClick(f)}
                      className="text-[10px] font-extrabold bg-white border px-3 py-1 rounded-full"
                    >
                      Detay →
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {odeme && (
        <OdemeModal
          paket={odeme.paket}
          musteri={odeme.musteri}
          onClose={() => setOdeme(null)}
          onSuccess={randevulariGetir}
        />
      )}
    </div>
  );
}