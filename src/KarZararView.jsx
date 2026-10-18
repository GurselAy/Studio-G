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

export default function KarZararView({ odemeler, giderler, kazanclar, setActiveScreen }) {
  const toplamTahsil = odemeler.filter((o) => o.tur === 'tahsil').reduce((s, o) => s + o.tutar, 0);
  const toplamIade = odemeler.filter((o) => o.tur === 'iade').reduce((s, o) => s + o.tutar, 0);
  const ciro = toplamTahsil - toplamIade;
  const gGider = giderler.filter((g) => g.tur === 'genel').reduce((s, g) => s + g.tutar, 0);
  const eGider = giderler.filter((g) => g.tur === 'egitmen').reduce((s, g) => s + g.tutar, 0);
  const tGider = gGider + eGider;
  const oKazanc = kazanclar.filter((k) => k.durum === 'odendi').reduce((s, k) => s + k.tutar, 0);
  const bKazanc = kazanclar.filter((k) => k.durum === 'beklemede').reduce((s, k) => s + k.tutar, 0);
  const kar = ciro - tGider - oKazanc;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Kar / Zarar</span>
        <span />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat label="Ciro" value={fmtTutar(ciro)} sub={'Tahsil ' + fmtTutar(toplamTahsil) + ' · İade ' + fmtTutar(toplamIade)} color="text-slate-900" />
          <Stat label="Toplam Gider" value={fmtTutar(tGider)} sub={'Genel ' + fmtTutar(gGider) + ' · Eğitmen ' + fmtTutar(eGider)} color="text-rose-600" />
          <Stat label="Eğitmen Kazancı" value={fmtTutar(oKazanc)} sub={'Bekleyen ' + fmtTutar(bKazanc)} color="text-emerald-600" />
          <Stat label="Kar / Zarar" value={fmtTutar(kar)} sub={kar >= 0 ? 'Kâr' : 'Zarar'} color={kar >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Hesap Detayı</h3>
          <div className="text-xs text-slate-600 space-y-2">
            <div className="flex justify-between"><span>+ Ciro (net tahsil)</span><span className="font-bold text-slate-900">{fmtTutar(ciro)}</span></div>
            <div className="flex justify-between"><span>- Genel Gider</span><span className="font-bold text-rose-600">{fmtTutar(gGider)}</span></div>
            <div className="flex justify-between"><span>- Eğitmen Giderleri</span><span className="font-bold text-rose-600">{fmtTutar(eGider)}</span></div>
            <div className="flex justify-between"><span>- Ödenmiş Eğitmen Kazancı</span><span className="font-bold text-rose-600">{fmtTutar(oKazanc)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="font-bold">= Kar / Zarar</span><span className={'font-bold ' + (kar >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{fmtTutar(kar)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
