import React from 'react';
import { ButtonOutline, fmtTutar } from './App';

function Stat({ label, value, sub, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={'font-bold text-lg ' + color}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function IstatistikView({ randevular, musteriler, hizmetler, odemeler, giderler, egitmenler, setActiveScreen }) {
  const t = randevular.length;
  const ta = randevular.filter((r) => r.durum === 'tamamlandi').length;
  const be = randevular.filter((r) => r.durum === 'beklemede').length;
  const ip = randevular.filter((r) => r.durum === 'iptal').length;
  const gelir = odemeler.filter((o) => o.tur === 'tahsil').reduce((s, o) => s + o.tutar, 0);
  const iade = odemeler.filter((o) => o.tur === 'iade').reduce((s, o) => s + o.tutar, 0);
  const gider = giderler.reduce((s, g) => s + g.tutar, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">İstatistik</span>
        <span />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Stat label="Toplam Randevu" value={String(t)} sub={'Müşteri ' + musteriler.length + ' · Hizmet ' + hizmetler.length + ' · Eğitmen ' + egitmenler.length} color="text-slate-900" />
          <Stat label="Tamamlanan" value={String(ta)} sub={'Beklemede ' + be} color="text-emerald-600" />
          <Stat label="İptal" value={String(ip)} sub={'Net Gelir ' + fmtTutar(gelir - iade)} color="text-rose-600" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Gelir / Gider</h3>
            <div className="text-sm font-bold text-emerald-600 mb-1">Toplam Gelir: {fmtTutar(gelir)}</div>
            <div className="text-sm font-bold text-rose-600 mb-1">Toplam Gider: {fmtTutar(gider)}</div>
            <div className="text-sm font-bold text-slate-900 mt-3">Net: {fmtTutar(gelir - iade - gider)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Randevu Dağılımı</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600"><span>Tamamlanan</span><span className="font-bold text-emerald-600">{ta}</span></div>
              <div className="flex justify-between text-slate-600"><span>Beklemede</span><span className="font-bold text-violet-600">{be}</span></div>
              <div className="flex justify-between text-slate-600"><span>İptal</span><span className="font-bold text-rose-600">{ip}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
