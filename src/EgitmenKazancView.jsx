import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';

export default function EgitmenKazancView() {
  const [data, setData] = useState([]);
  const [detay, setDetay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ay, setAy] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { getir(); }, [ay]);

  const getir = async () => {
    setLoading(true);
    const start = new Date(ay + '-01T00:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const { data: kazanc } = await supabase
      .from('egitmen_kazanc_hareketleri')
      .select('*, kullanicilar!egitmen_kazanc_hareketleri_egitmen_id_fkey(adi), musteriler(adi)')
      .gte('tarih', start.toISOString())
      .lt('tarih', end.toISOString())
      .order('tarih', { ascending: false });
    if (kazanc) {
      const map = {};
      kazanc.forEach((k) => {
        const id = k.egitmen_id;
        if (!map[id]) map[id] = { id, adi: k.kullanicilar?.adi || 'Bilinmeyen', toplam: 0, adet: 0 };
        map[id].toplam += parseFloat(k.tutar || 0);
        map[id].adet += 1;
      });
      setData(Object.values(map).sort((a, b) => b.toplam - a.toplam));
      setDetay(kazanc);
    }
    setLoading(false);
  };

  const toplamKazanc = useMemo(() => data.reduce((s, d) => s + d.toplam, 0), [data]);
  const toplamSeans = useMemo(() => data.reduce((s, d) => s + d.adet, 0), [data]);

  return (
    <div className="flex flex-col h-full bg-slate-50 p-3 space-y-3 overflow-y-auto">
      <div className="bg-white p-3 rounded-xl border flex justify-between items-center">
        <div>
          <h2 className="text-[14px] font-extrabold text-slate-900">Eğitmen Hakediş</h2>
          <p className="text-[11px] font-bold text-slate-500">
            {toplamSeans} tamamlanan seans • {toplamKazanc.toLocaleString('tr-TR')} TL dağıtıldı
          </p>
        </div>
        <input
          type="month"
          value={ay}
          onChange={(e) => setAy(e.target.value)}
          className="px-3 py-1.5 border rounded-xl bg-slate-50 text-xs font-bold"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs font-bold">Yükleniyor...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-xs font-bold text-slate-400">Bu ay kazanç yok</div>
      ) : (
        <>
          {data.map((d, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border shadow-sm flex justify-between items-center">
              <div>
                <div className="text-[13px] font-extrabold text-slate-900">{d.adi}</div>
                <div className="text-[11px] font-bold text-slate-500">{d.adet} seans tamamladı</div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-extrabold text-[#5b46f5]">
                  {d.toplam.toLocaleString('tr-TR')} TL
                </div>
                <div className="text-[10px] font-bold text-slate-400">hakediş</div>
              </div>
            </div>
          ))}
          <div className="bg-white rounded-xl border p-3">
            <h3 className="text-[12px] font-extrabold text-slate-900 mb-2">Seans Detayları</h3>
            {detay.map((k) => (
              <div key={k.id} className="flex justify-between py-1.5 border-b last:border-0 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700">
                    {k.tarih ? new Date(k.tarih).toLocaleDateString('tr-TR') : '-'}
                  </span>
                  <span className="font-extrabold text-slate-900 ml-2">
                    {k.kullanicilar?.adi?.split(' ')[0] || '?'}
                  </span>
                  <span className="ml-2 text-slate-500">{k.musteriler?.adi || '-'}</span>
                </div>
                <span className="font-extrabold text-slate-900">
                  {parseFloat(k.tutar || 0).toLocaleString('tr-TR')} TL
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}