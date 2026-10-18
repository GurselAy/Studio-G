import React from 'react';
import { ButtonOutline, fmtTutar, fmtTarih, adSoyad } from './App';

export default function EgitmenKazancView({ egitmenler, randevular, kazanclar, setActiveScreen }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Eğitmen Kazanç Hareketleri</span>
        <span />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {egitmenler.map((e) => {
          const hareketler = kazanclar.filter((k) => k.egitmenId === e.id);
          return (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="font-bold text-slate-900 mb-2">{adSoyad(e)}</div>
              {hareketler.length === 0 ? (
                <div className="text-xs text-slate-400">Henüz kazanç hareketi yok.</div>
              ) : (
                <div className="space-y-2">
                  {hareketler.map((k) => {
                    const r = randevular.find((x) => x.id === k.randevuId);
                    return (
                      <div key={k.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-b-0">
                        <div>
                          <div className="font-medium">{r ? `${r.tarih} · ${r.baslangic}-${r.bitis}` : '-'}</div>
                          <div className="text-[10px] text-slate-500">{fmtTarih(k.tarih)}</div>
                        </div>
                        <div className="text-right">
                          <div className={'font-bold ' + (k.durum === 'odendi' ? 'text-emerald-600' : 'text-rose-600')}>{fmtTutar(k.tutar)}</div>
                          <div className="text-[10px] text-slate-500">{k.durum === 'odendi' ? 'Ödendi' : 'Beklemede'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
