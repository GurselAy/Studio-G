import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';

export default function KarZararView() {
  const [tab, setTab] = useState('aylik');
  const [ay, setAy] = useState(new Date().toISOString().slice(0, 7));
  const [yil, setYil] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [dagilim, setDagilim] = useState([]);
  const [aylikDetay, setAylikDetay] = useState([]);

  useEffect(() => { getir(); }, [ay, yil, tab]);

  const getir = async () => {
    if (tab === 'aylik') await getirAylik();
    else await getirYillik();
  };

  const getirAylik = async () => {
    const start = new Date(ay + '-01T00:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    const [odemeRes, kazancRes, giderRes] = await Promise.all([
      supabase.from('odeme_hareketleri').select('tutar,tarih').gte('tarih', start.toISOString()).lt('tarih', end.toISOString()),
      supabase.from('egitmen_kazanc_hareketleri').select('tutar,tarih,egitmen_id,kullanicilar(adi)').gte('tarih', start.toISOString()).lt('tarih', end.toISOString()),
      supabase.from('isletme_giderleri').select('*,kullanicilar(adi)').gte('tarih', ay + '-01').lt('tarih', `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`),    ]);
    const odemeler = odemeRes.data || [];
    const kazanc = kazancRes.data || [];
    const gider = giderRes.data || [];
    const gelir = odemeler.reduce((s, x) => s + parseFloat(x.tutar || 0), 0);
    const egitmenGider = kazanc.reduce((s, x) => s + parseFloat(x.tutar || 0), 0);
    const genelGider = gider.reduce((s, x) => s + parseFloat(x.tutar || 0), 0);
    const toplamGider = egitmenGider + genelGider;
    setStats({ gelir, gider: toplamGider, net: gelir - toplamGider });
    const map = {};
    gider.forEach((g) => {
      const key = g.kullanicilar?.adi || g.kategori || 'Diğer';
      map[key] = (map[key] || 0) + parseFloat(g.tutar || 0);
    });
    if (egitmenGider > 0) map['Eğitmen Hakedişleri'] = egitmenGider;
    const list = Object.entries(map)
      .map(([ad, tutar]) => ({ ad, tutar }))
      .sort((a, b) => b.tutar - a.tutar);
    setDagilim(list);
  };

  const getirYillik = async () => {
    const yilStart = new Date(yil, 0, 1).toISOString();
    const yilEnd = new Date(yil + 1, 0, 1).toISOString();
    const [odemeRes, kazancRes, giderRes] = await Promise.all([
      supabase.from('odeme_hareketleri').select('tutar,tarih').gte('tarih', yilStart).lt('tarih', yilEnd),
      supabase.from('egitmen_kazanc_hareketleri').select('tutar,tarih').gte('tarih', yilStart).lt('tarih', yilEnd),
      supabase.from('isletme_giderleri').select('tutar,tarih').gte('tarih', yilStart).lt('tarih', yilEnd),
    ]);
    const odemeler = odemeRes.data || [];
    const kazanc = kazancRes.data || [];
    const gider = giderRes.data || [];
    const months = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(yil, m, 1).getTime();
      const mEnd = new Date(yil, m + 1, 1).getTime();
      const mGelir = odemeler
        .filter((o) => {
          const t = o.tarih ? new Date(o.tarih).getTime() : 0;
          return t >= mStart && t < mEnd;
        })
        .reduce((s, x) => s + parseFloat(x.tutar || 0), 0);
      const mGider =
        kazanc
          .filter((k) => {
            const t = k.tarih ? new Date(k.tarih).getTime() : 0;
            return t >= mStart && t < mEnd;
          })
          .reduce((s, x) => s + parseFloat(x.tutar || 0), 0) +
        gider
          .filter((g) => {
            const t = g.tarih ? new Date(g.tarih).getTime() : 0;
            return t >= mStart && t < mEnd;
          })
          .reduce((s, x) => s + parseFloat(x.tutar || 0), 0);
      months.push({ ay: m + 1, gelir: mGelir, gider: mGider, net: mGelir - mGider });
    }
    setAylikDetay(months);
    const first = months[0];
    setStats({ gelir: first.gelir, gider: first.gider, net: first.net });
  };

  const ayAd = (ym) => {
    const d = new Date(ym + '-01');
    return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  };
  const ayArttir = (dir) => {
    if (tab === 'aylik') {
      const d = new Date(ay + '-01');
      d.setMonth(d.getMonth() + dir);
      setAy(d.toISOString().slice(0, 7));
    } else {
      setYil(yil + dir);
    }
  };
  if (!stats) return <div className="p-10 text-center text-xs font-bold">Yükleniyor...</div>;
  const maxDagilim = Math.max(...dagilim.map((d) => d.tutar), 1);

  return (
    <div className="flex flex-col h-full bg-[#f6f5ff] overflow-y-auto">
      <div className="bg-white p-4 border-b">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('aylik')}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold ${
              tab === 'aylik' ? 'bg-[#5b46f5] text-white shadow' : 'text-slate-500'
            }`}
          >
            Aylık
          </button>
          <button
            onClick={() => setTab('yillik')}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold ${
              tab === 'yillik' ? 'bg-[#5b46f5] text-white shadow' : 'text-slate-500'
            }`}
          >
            Yıllık
          </button>
        </div>
        <div className="flex justify-between items-center mt-3">
          <button onClick={() => ayArttir(-1)} className="w-8 h-8 bg-slate-50 border rounded-full flex items-center justify-center">‹</button>
          <span className="text-[14px] font-extrabold">{tab === 'aylik' ? ayAd(ay) : yil}</span>
          <button onClick={() => ayArttir(1)} className="w-8 h-8 bg-slate-50 border rounded-full flex items-center justify-center">›</button>
        </div>
      </div>
      {tab === 'aylik' ? (
        <>
          <div className="p-3 grid grid-cols-3 gap-2">
            <div className="bg-white p-3 rounded-2xl border shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <span className="text-emerald-500">↗</span>Gelir
              </div>
              <div className="text-[14px] font-extrabold mt-1">₺{stats.gelir.toLocaleString('tr-TR')}</div>
            </div>
            <div className="bg-white p-3 rounded-2xl border shadow-sm text-center">
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <span className="text-red-500">↘</span>Gider
              </div>
              <div className="text-[14px] font-extrabold mt-1">₺{stats.gider.toLocaleString('tr-TR')}</div>
            </div>
            <div className={`${stats.net >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} p-3 rounded-2xl border text-center shadow-sm`}>
              <div className={`text-[10px] font-bold ${stats.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {stats.net >= 0 ? 'KAR' : 'ZARAR'}
              </div>
              <div className={`text-[14px] font-extrabold mt-1 ${stats.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                ₺{Math.abs(stats.net).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              <h3 className="text-[14px] font-extrabold mb-3">Gider Dağılımı</h3>
              <div className="space-y-3">
                {dagilim.length === 0 ? (
                  <div className="text-[11px] font-bold text-slate-400">Gider yok</div>
                ) : (
                  dagilim.map((d, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[12px]">
                        <span className="font-bold text-slate-700 text-left">{d.ad}</span>
                        <span className="font-extrabold">₺{d.tutar.toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#fb7185] to-[#ef4444] rounded-full"
                          style={{ width: `${(d.tutar / maxDagilim) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : 
      ( <div className="p-3 space-y-2">
          {aylikDetay.map((m, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border flex justify-between items-center">
              <div className="text-left">
                <div className="text-[13px] font-extrabold">
                  {new Date(yil, i, 1).toLocaleDateString('tr-TR', { month: 'long' })}
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  Gelir ₺{m.gelir.toLocaleString('tr-TR')} • Gider ₺{m.gider.toLocaleString('tr-TR')}
                </div>
              </div>
              <div
                className={`text-[13px] font-extrabold ${
                  m.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                ₺{m.net.toLocaleString('tr-TR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}