import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, fmtTutar } from './App';

export default function ServicesView({ hizmetler, setActiveScreen, addHizmet, editHizmet, deleteHizmet }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [ad, setAd] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [sure, setSure] = useState('40');
  const [aktif, setAktif] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Hizmetler</span>
        <Button
          onClick={() => { setAd(''); setFiyat(''); setSure('40'); setAktif(true); setEdit(null); setOpen(true); }}
          className="px-3 py-1.5 text-xs"
        >
          + Hizmet
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {hizmetler.map((h) => (
            <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  {h.ad}
                  {!h.aktif && <span className="text-[10px] rounded-full bg-slate-200 text-slate-600 px-2 py-0.5">Pasif</span>}
                </div>
                <div className="text-xs text-slate-500">{fmtTutar(h.fiyat)} · {h.sure} dk</div>
              </div>
              <div className="flex items-center gap-2">
                <ButtonOutline
                  onClick={() => { setAd(h.ad); setFiyat(String(h.fiyat)); setSure(String(h.sure)); setAktif(h.aktif); setEdit(h); setOpen(true); }}
                  className="px-3 py-1.5 text-xs"
                >
                  Düzenle
                </ButtonOutline>
                <ButtonOutline
                  onClick={() => { if (confirm(h.ad + ' silinsin mi?')) deleteHizmet(h.id); }}
                  className="px-3 py-1.5 text-xs text-red-600 border-red-200"
                >
                  Sil
                </ButtonOutline>
              </div>
            </div>
          ))}
        </div>
      </div>
      {open && (
        <ModalShell
          title={edit ? 'Hizmet Düzenle' : 'Yeni Hizmet'}
          onClose={() => setOpen(false)}
          footer={
            <>
              <ButtonOutline onClick={() => setOpen(false)}>İptal</ButtonOutline>
              <Button
                onClick={() => {
                  if (!ad) return;
                  const data = { ad, fiyat: parseFloat(fiyat) || 0, sure: parseInt(sure) || 40, aktif };
                  if (edit) editHizmet(edit.id, data); else addHizmet(data);
                  setOpen(false);
                }}
              >
                Kaydet
              </Button>
            </>
          }
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hizmet Adı</label>
            <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={ad} onChange={(e) => setAd(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fiyat</label>
            <NumericInput value={fiyat} onChange={setFiyat} placeholder="0" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Süre (dk)</label>
            <NumericInput value={sure} onChange={setSure} placeholder="40" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
            Aktif
          </label>
        </ModalShell>
      )}
    </div>
  );
}
