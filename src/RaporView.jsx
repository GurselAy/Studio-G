import React from 'react';
import { ButtonOutline, fmtTutar, adSoyad } from './App';

function Mini({ label, value, color }) {
  return (
    <div className="p-2 rounded border border-slate-200 bg-slate-50">
      <div className="text-slate-500 text-[10px] uppercase">{label}</div>
      <div className={'font-bold ' + (color || 'text-slate-900')}>{value}</div>
    </div>
  );
}

export default function RaporView({ egitmenler, randevular, kazanclar, setActiveScreen }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Eğitmen Raporları</span>
        <span />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          {egitmenler.map((e) => {
            const egR = randevular.filter((r) => r.egitmenId === e.id && r.durum !== 'iptal');
            const sayi = egR.length;
            const toplam = egR.reduce((s, r) => s + r.toplamTutar, 0);
            const odenen = egR.reduce((s, r) => s + r.odenenTutar, 0);
            const bKazanc = kazanclar.filter((k) => k.egitmenId === e.id && k.durum === 'beklemede').reduce((s, k) => s + k.tutar, 0);
            const oKazanc = kazanclar.filter((k) => k.egitmenId === e.id && k.durum === 'odendi').reduce((s, k) => s + k.tutar, 0);
            return (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-slate-900">{adSoyad(e)}</div>
                  <div className="text-xs text-violet-600 font-bold">{Object.keys(e.hizmetUcretleri || {}).length} hizmet</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Mini label="Seans" value={String(sayi)} />
                  <Mini label="Toplam" value={fmtTutar(toplam)} />
                  <Mini label="Ödenen" value={fmtTutar(odenen)} color="text-emerald-600" />
                  <Mini label="Kazanç" value={fmtTutar(oKazanc)} color="text-emerald-600" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <div className="text-slate-500 text-[10px] uppercase">Bekleyen Kazanç</div>
                    <div className="font-bold text-rose-600">{fmtTutar(bKazanc)}</div>
                  </div>
                  <div className="p-2 rounded border border-slate-200 bg-slate-50">
                    <div className="text-slate-500 text-[10px] uppercase">Net Kazanç</div>
                    <div className="font-bold text-slate-900">{fmtTutar(oKazanc)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
