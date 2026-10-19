import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function IstatistikView() {
  const [ay, setAy] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getir(); }, [ay]);

  const getir = async () => {
    setLoading(true);
    const start = new Date(ay + '-01T00:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    // Paralel sorgular
    const [randevuRes, paketRes, odemeRes, kazancRes] = await Promise.all([
      supabase
        .from('randevular')
        .select('*, hizmetler(adi, tur), kullanicilar(adi)')
        .gte('baslangic_saati', start.toISOString())
        .lt('baslangic_saati', end.toISOString()),
      supabase
        .from('musteri_paketleri')
        .select('*')
        .gte('olusturma_tarihi', start.toISOString())
        .lt('olusturma_tarihi', end.toISOString()),
      supabase
        .from('odeme_hareketleri')
        .select('*')
        .gte('tarih', start.toISOString())
        .lt('tarih', end.toISOString()),
      supabase
        .from('egitmen_kazanc_hareketleri')
        .select('*, kullanicilar!egitmen_kazanc_hareketleri_egitmen_id_fkey(adi)')
        .gte('tarih', start.toISOString())
        .lt('tarih', end.toISOString()),
    ]);
    const randevular = randevuRes.data;
    const paketler = paketRes.data;
    const odemeler = odemeRes.data;
    const kazanc = kazancRes.data;
    if (randevular) {
      const toplam = randevular.length;
      const tamam = randevular.filter((r) => r.durum === 'tamamlandı').length;
      const iptal = randevular.filter((r) => r.durum === 'iptal edildi').length;
      const plan = randevular.filter((r) => r.durum === 'planlandı').length;
      const week = [0, 0, 0, 0, 0, 0, 0];
      randevular.forEach((r) => {
        if (!r.baslangic_saati) return;
        const d = new Date(r.baslangic_saati).getDay();
        const idx = d === 0 ? 6 : d - 1;
        week[idx]++;
      });
      const maxWeek = Math.max(...week, 1);
      const hizmetMap = {};
      randevular.forEach((r) => {
        const ad = r.hizmetler?.adi || 'Diğer';
        hizmetMap[ad] = (hizmetMap[ad] || 0) + 1;
      });
      const hizmetList = Object.entries(hizmetMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const egitmenMap = {};
      randevular.forEach((r) => {
        const ad = r.kullanicilar?.adi || 'Bilinmeyen';
        egitmenMap[ad] = (egitmenMap[ad] || 0) + 1;
      });
      const egitmenList = Object.entries(egitmenMap).sort((a, b) => b[1] - a[1]);
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().slice(0, 10);
        const dayOdemeler = (odemeler || []).filter((o) => o.tarih && o.tarih.slice(0, 10) === ds);
        const sum = dayOdemeler.reduce((s, o) => s + parseFloat(o.tutar || 0), 0);
        last7.push({ date: ds.slice(5), sum });
      }
      const maxCiro = Math.max(...last7.map((x) => x.sum), 1);
      const ciro = (odemeler || []).reduce((s, o) => s + parseFloat(o.tutar || 0), 0);
      const hakedis = (kazanc || []).reduce((s, k) => s + parseFloat(k.tutar || 0), 0);
      setStats({
        toplam, tamam, iptal, plan, week, maxWeek,
        hizmetList, egitmenList, last7, maxCiro, ciro, hakedis,
        paketSayisi: paketler?.length || 0,
      });
    }
    setLoading(false);
  };
  if (loading || !stats) return <div className="p-10 text-center text-xs font-bold text-slate-400">İstatistik yükleniyor...</div>;
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-3 space-y-3">
      <div className="bg-white p-3 rounded-xl border flex justify-between items-center">
        <h2 className="text-[14px] font-extrabold text-slate-900">İstatistik</h2>
        <input
          type="month"
          value={ay}
          onChange={(e) => setAy(e.target.value)}
          className="px-3 py-1.5 border rounded-xl bg-slate-50 text-xs font-bold"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl border text-center">
          <div className="text-[20px] font-extrabold text-slate-900">{stats.toplam}</div>
          <div className="text-[10px] font-bold text-slate-500">TOPLAM SEANS</div>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
          <div className="text-[20px] font-extrabold text-emerald-700">{stats.tamam}</div>
          <div className="text-[10px] font-bold text-emerald-700">TAMAMLANAN</div>
        </div>
        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-center">
          <div className="text-[20px] font-extrabold text-[#5b46f5]">{stats.ciro.toLocaleString('tr-TR')} TL</div>
          <div className="text-[10px] font-bold text-[#5b46f5]">CİRO</div>
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border">
        <h3 className="text-[12px] font-extrabold text-slate-900 mb-3">Haftalık Doluluk</h3>
        <div className="flex items-end gap-1.5 h-[80px]">
          {['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#ede9fe] rounded-t-lg relative" style={{ height: `${Math.max((stats.week[i] / stats.maxWeek) * 60, 6)}px` }}>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-slate-700">
                  {stats.week[i]}
                </div>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-[#5b46f5] rounded-t-lg"
                  style={{ height: `${(stats.week[i] / stats.maxWeek) * 100}%` }}
                ></div>
              </div>
              <span className="text-[9px] font-extrabold text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border">
        <h3 className="text-[12px] font-extrabold text-slate-900 mb-2">Hizmet Dağılımı</h3>
        {stats.hizmetList.map(([ad, sayi], i) => {
          const max = stats.hizmetList[0][1];
          return (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span className="text-[11px] font-bold text-slate-700 w-[90px] truncate text-left">{ad}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#5b46f5]" style={{ width: `${(sayi / max) * 100}%` }}></div>
              </div>
              <span className="text-[11px] font-extrabold text-slate-900 w-6 text-right">{sayi}</span>
            </div>
          );
        })}
      </div>
      <div className="bg-white p-3 rounded-xl border">
        <h3 className="text-[12px] font-extrabold text-slate-900 mb-2">Eğitmen Performans</h3>
        {stats.egitmenList.map(([ad, sayi], i) => {
          const max = stats.egitmenList[0]?.[1] || 1;
          return (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <span className="text-[11px] font-bold w-[80px] truncate text-left">{ad}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(sayi / max) * 100}%` }}></div>
              </div>
              <span className="text-[11px] font-extrabold w-6 text-right">{sayi}</span>
            </div>
          );
        })}
      </div>
      <div className="bg-white p-3 rounded-xl border">
        <h3 className="text-[12px] font-extrabold text-slate-900 mb-3">Son 7 Gün Tahsilat</h3>
        <div className="flex items-end gap-1 h-[70px]">
          {stats.last7.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] font-bold text-slate-600">{d.sum > 0 ? `${d.sum}` : ''}</div>
              <div className="w-full bg-emerald-100 rounded-t-lg relative" style={{ height: `${Math.max((d.sum / stats.maxCiro) * 50, 4)}px` }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-lg"
                  style={{ height: `${(d.sum / stats.maxCiro) * 100}%` }}
                ></div>
              </div>
              <span className="text-[8px] font-bold text-slate-500">{d.date}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pb-4">
        <div className="bg-white p-3 rounded-xl border">
          <div className="text-[10px] font-bold text-slate-500">PAKET SATIŞ</div>
          <div className="text-[16px] font-extrabold">{stats.paketSayisi} paket</div>
        </div>
        <div className="bg-white p-3 rounded-xl border">
          <div className="text-[10px] font-bold text-slate-500">EĞİTMEN HAKEDİŞ</div>
          <div className="text-[16px] font-extrabold text-amber-600">{stats.hakedis.toLocaleString('tr-TR')} TL</div>
        </div>
      </div>
    </div>
  );
}