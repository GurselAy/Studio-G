import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, fmtTutar } from './App';

export default function OdemeModal({ randevu, onClose, onTahsil }) {
  const kalan = Math.max(0, randevu.toplamTutar - randevu.odenenTutar);
  const [tutar, setTutar] = useState(String(kalan));

  return (
    <ModalShell
      title="Ödeme Tahsil Et"
      onClose={onClose}
      footer={
        <>
          <ButtonOutline onClick={onClose}>İptal</ButtonOutline>
          <Button
            onClick={() => {
              const t = parseFloat(tutar) || 0;
              if (t > 0) { onTahsil(t); onClose(); }
            }}
          >
            Tahsil Et
          </Button>
        </>
      }
    >
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Toplam Tutar</span>
          <span className="font-bold text-slate-900">{fmtTutar(randevu.toplamTutar)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ödenen</span>
          <span className="font-semibold text-emerald-600">{fmtTutar(randevu.odenenTutar)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kalan Borç</span>
          <span className="font-bold text-rose-600">{fmtTutar(kalan)}</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Tahsil Edilecek Tutar</label>
        <NumericInput
          value={tutar}
          onChange={setTutar}
          placeholder="0"
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>
    </ModalShell>
  );
}
