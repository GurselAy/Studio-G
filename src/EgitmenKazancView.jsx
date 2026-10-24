import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

const tl = (n) => parseFloat(n || 0).toLocaleString('tr-TR');
const bugun = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EgitmenKazancView() {
  const [data, setData] = useState([]);
  const [detay, setDetay] = useState([]);
  const [odemeler, setOdemeler] = useState([]);
  const [bakiyeListe, setBakiyeListe] = useState([]);
  const [isim, setIsim] = useState({});
  const [odemeAcik, setOdemeAcik] = useState(null); // egitmen_id
  const [tutar, setTutar] = useState('');
  const [odemeTarihi, setOdemeTarihi] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ay, setAy] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { getir(); }, [ay]);
  useEffect(() => {
    if (odemeAcik) setOdemeTarihi(bugun());
  }, [odemeAcik]);

  const getir = async () => {
    setLoading(true);
    const start = new Date(ay + '-01T00:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const [{ data: kazanc }, { data: od }, { data: kazancTum }, { data: odTum }] = await Promise.all([
      supabase
        .from('egitmen_kazanc_hareketleri')
        .select('*, kullanicilar!egitmen_kazanc_hareketleri_egitmen_id_fkey(adi), randevular(randevu_katilimcilari(musteriler(adi)))')
        .gte('tarih', start.toISOString())
        .lt('tarih', end.toISOString())
        .order('tarih', { ascending: false }),
      supabase
        .from('egitmen_maas_odemeleri')
        .select('*, kullanicilar!egitmen_maas_odemeleri_egitmen_id_fkey(adi)')
        .gte('tarih', start.toISOString())
        .lt('tarih', end.toISOString())
        .order('tarih', { ascending: false }),
      supabase.from('egitmen_kazanc_hareketleri').select('egitmen_id, tutar'),
      supabase.from('egitmen_maas_odemeleri').select('egitmen_id, tutar'),
    ]);

    const kListe = kazanc || [];
    const oListe = od || [];

    // Bu ay özeti
    const map = {};
    kListe.forEach((k) => {
      const id = k.egitmen_id;
      if (!map[id]) map[id] = { id, adi: k.kullanicilar?.adi || 'Bilinmeyen', toplam: 0, adet: 0 };
      map[id].toplam += parseFloat(k.tutar || 0);
      map[id].adet += 1;
    });
    setData(Object.values(map).sort((a, b) => b.toplam - a.toplam));
    setDetay(kListe);
    setOdemeler(oListe);

    // İsim haritası
    const isimler = {};
    kListe.forEach((k) => { isimler[k.egitmen_id] = k.kullanicilar?.adi || isimler[k.egitmen_id]; });
    oListe.forEach((o) => { isimler[o.egitmen_id] = o.kullanicilar?.adi || isimler[o.egitmen_id]; });
    setIsim(isimler);

    // Tüm zamanlar bakiye = kazanç - ödeme
    const kMap = {}, oMap = {};
    (kazancTum || []).forEach((k) => { kMap[k.egitmen_id] = (kMap[k.egitmen_id] || 0) + parseFloat(k.tutar || 0); });
    (odTum || []).forEach((o) => { oMap[o.egitmen_id] = (oMap[o.egitmen_id] || 0) + parseFloat(o.tutar || 0); });
    const ids = [...new Set([...Object.keys(kMap), ...Object.keys(oMap)])];
    setBakiyeListe(
      ids
        .map((id) => ({ id, adi: isimler[id] || 'Bilinmeyen', kalan: (kMap[id] || 0) - (oMap[id] || 0) }))
        .sort((a, b) => b.kalan - a.kalan)
    );
    setLoading(false);
  };

  const odemeKaydet = async (egitmenId) => {
    const t = parseFloat(tutar);
    if (!t || t <= 0) return alert('Tutar girin');
    if (!odemeTarihi) return alert('Tarih seçin');
    setKaydediliyor(true);
    const { error } = await supabase.from('egitmen_maas_odemeleri').insert([{
      egitmen_id: egitmenId,
      tutar: t,
      tarih: new Date(odemeTarihi + 'T12:00:00').toISOString(),
    }]);
    setKaydediliyor(false);
    if (error) return alert('Kaydedilemedi: ' + error.message);
    setOdemeAcik(null);
    setTutar('');
    getir();
  };
  
  const odemeSil = async (id) => {
    if (!window.confirm('Bu ödeme kaydı silinsin mi?')) return;
    const { error } = await supabase.from('egitmen_maas_odemeleri').delete().eq('id', id);
    if (error) return alert('Silinemedi: ' + error.message);
    getir();
  };

  const toplamKazanc = useMemo(() => data.reduce((s, d) => s + d.toplam, 0), [data]);
  const toplamSeans = useMemo(() => data.reduce((s, d) => s + d.adet, 0), [data]);
  const toplamOdeme = useMemo(() => odemeler.reduce((s, o) => s + parseFloat(o.tutar || 0), 0), [odemeler]);

  const OdemeFormu = ({ egitmenId }) => (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-2">
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Tutar (TL)"
          value={tutar}
          onChange={(e) => setTutar(e.target.value.replace(/\D/g, ''))}
          className="flex-1 px-3 py-2 border rounded-xl bg-slate-50 font-bold text-xs md:text-[13px]"
        />
        <input
          type="date"
          value={odemeTarihi}
          onChange={(e) => setOdemeTarihi(e.target.value)}
          className="px-2 py-2 border rounded-xl bg-slate-50 font-bold text-xs md:text-[13px]"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => odemeKaydet(egitmenId)}
          disabled={kaydediliyor}
          className="flex-1 py-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl font-extrabold text-xs md:text-[13px] disabled:opacity-50 transition"
        >
          {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        <button
          onClick={() => { setOdemeAcik(null); setTutar(''); }}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-extrabold text-xs md:text-[13px] transition"
        >
          İptal
        </button>
      </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full bg-slate-50 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto md:max-w-6xl md:mx-auto md:w-full">
      <div className="bg-white p-3 md:p-4 rounded-xl border flex justify-between items-center gap-3">
        <div>
          <h2 className="text-[14px] md:text-[17px] font-extrabold text-slate-900">Eğitmen Hakediş</h2>
          <p className="text-[11px] md:text-[12px] font-bold text-slate-500">
            {toplamSeans} tamamlanan seans • {tl(toplamKazanc)} TL hakediş • {tl(toplamOdeme)} TL ödendi
          </p>
        </div>
        <input
          type="month"
          value={ay}
          onChange={(e) => setAy(e.target.value)}
          className="px-3 py-1.5 border rounded-xl bg-slate-50 text-xs md:text-[13px] font-bold shrink-0 md:hover:border-slate-300 transition"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs md:text-[13px] font-bold">Yükleniyor...</div>
      ) : data.length === 0 && odemeler.length === 0 ? (
        <div className="text-center py-10 text-xs md:text-[13px] font-bold text-slate-400">Bu ay kayıt yok</div>
      ) : (
        <>
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start">
          {data.map((d) => {
            const odBuAy = odemeler
              .filter((o) => o.egitmen_id === d.id)
              .reduce((s, o) => s + parseFloat(o.tutar || 0), 0);
            const kalanAy = d.toplam - odBuAy;
            const bk = bakiyeListe.find((b) => b.id === d.id)?.kalan || 0;
            return (
              <div key={d.id} className="bg-white p-3 md:p-4 rounded-xl border shadow-sm md:hover:shadow-md transition">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[13px] md:text-[14px] font-extrabold text-slate-900">{d.adi}</div>
                    <div className="text-[11px] md:text-[12px] font-bold text-slate-500">{d.adet} seans tamamladı</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] md:text-[18px] font-extrabold text-[#5b46f5]">{tl(d.toplam)} TL</div>
                    <div className="text-[10px] md:text-[11px] font-bold text-slate-400">hakediş</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center gap-2">
                  <div className="text-[10px] md:text-[11px] font-bold text-slate-500">
                    Bu ay ödenen: <span className="text-emerald-700 font-extrabold">{tl(odBuAy)} TL</span>
                    {kalanAy !== 0 && (
                      <> • Kalan: <span className={`font-extrabold ${kalanAy > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{tl(kalanAy)} TL</span></>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setOdemeAcik(odemeAcik === d.id ? null : d.id);
                      setTutar(kalanAy > 0 ? String(Math.round(kalanAy)) : '');
                    }}
                    className="px-2.5 py-1 text-[10px] md:text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white rounded-full shrink-0 transition"
                  >
                    Ödeme Kaydet
                  </button>
                </div>
                {bk !== 0 && (
                  <div className="mt-1 text-[10px] md:text-[11px] font-bold text-slate-400">
                    Tüm zamanlar bakiye: <span className={bk > 0 ? 'text-rose-600' : 'text-emerald-600'}>{tl(bk)} TL</span>
                  </div>
                )}
                {odemeAcik === d.id && <OdemeFormu egitmenId={d.id} />}
              </div>
            );
          })}
          </div>

          <div className="bg-white rounded-xl border p-3 md:p-4">
            <h3 className="text-[12px] md:text-[14px] font-extrabold text-slate-900 mb-2">Seans Detayları</h3>
            {detay.length === 0 ? (
              <div className="text-[11px] md:text-[12px] font-bold text-slate-400">Bu ay seans yok</div>
            ) : (
              detay.map((k) => {
                const adlar = (k.randevular?.randevu_katilimcilari || []).map((x) => x.musteriler?.adi).filter(Boolean).join(', ');
                return (
                  <div key={k.id} className="flex justify-between py-1.5 border-b last:border-0 text-[11px] md:text-[12px] md:hover:bg-slate-50 md:px-1 md:rounded transition">
                    <div>
                      <span className="font-bold text-slate-700">
                        {k.tarih ? new Date(k.tarih).toLocaleDateString('tr-TR') : '-'}
                      </span>
                      <span className="font-extrabold text-slate-900 ml-2">
                        {k.kullanicilar?.adi?.split(' ')[0] || '?'}
                      </span>
                      <span className="ml-2 text-slate-500">{adlar || '-'}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">
                      {tl(k.tutar)} TL
                    </span>
                  </div>
                );
              })  
            )}       
          </div>

          {odemeler.length > 0 && (
            <div className="bg-white rounded-xl border p-3 md:p-4">
              <h3 className="text-[12px] md:text-[14px] font-extrabold text-slate-900 mb-2">Bu Ay Yapılan Ödemeler</h3>
              {odemeler.map((o) => (
                <div key={o.id} className="flex justify-between items-center py-1.5 border-b last:border-0 text-[11px] md:text-[12px]">
                  <div>
                    <span className="font-bold text-slate-700">
                      {o.tarih ? new Date(o.tarih).toLocaleDateString('tr-TR') : '-'}
                    </span>
                    <span className="ml-2 font-extrabold text-slate-900">{isim[o.egitmen_id] || '?'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-700">{tl(o.tutar)} TL</span>
                    <button onClick={() => odemeSil(o.id)} className="text-red-500 font-extrabold px-1 md:hover:bg-red-50 md:rounded transition" title="Sil">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {bakiyeListe.length > 0 && (
            <div className="bg-white rounded-xl border p-3 md:p-4 pb-4">
              <h3 className="text-[12px] md:text-[14px] font-extrabold text-slate-900 mb-2">Bakiyeler (tüm zamanlar)</h3>
              {bakiyeListe.map((b) => (
                <div key={b.id}>
                  <div className="flex justify-between items-center py-1.5 border-b last:border-0">
                    <span className="text-[11px] md:text-[12px] font-bold text-slate-700">{b.adi}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[12px] md:text-[13px] font-extrabold ${b.kalan > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tl(b.kalan)} TL
                      </span>
                      {b.kalan > 0 && (
                        <button
                          onClick={() => { setOdemeAcik('bk-' + b.id); setTutar(String(Math.round(b.kalan))); }}
                          className="px-2 py-0.5 text-[10px] md:text-[11px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white rounded-full transition"
                        >
                          Öde
                        </button>
                      )}
                    </div>
                  </div>
                  {odemeAcik === 'bk-' + b.id && <OdemeFormu egitmenId={b.id} />}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
