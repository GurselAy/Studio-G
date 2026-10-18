import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, fmtTutar, fmtTarih, adSoyad, bugun } from './App';

export default function GiderView({ giderler, egitmenler, setActiveScreen, addGider, editGider, deleteGider }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [secili, setSecili] = useState('genel');
  const [tutar, setTutar] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [tarih, setTarih] = useState(bugun);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Giderler</span>
        <Button
          onClick={() => { setSecili('genel'); setTutar(''); setAciklama(''); setTarih(bugun); setEdit(null); setOpen(true); }}
          className="px-3 py-1.5 text-xs"
        >
          + Gider
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {giderler.map((g) => {
            const etiket = g.tur === 'genel'
              ? 'Genel'
              : (() => { const eg = egitmenler.find((e) => e.id === g.egitmenId); return eg ? adSoyad(eg) : 'Eğitmen'; })();
            return (
              <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{etiket}</div>
                  <div className="text-xs text-slate-500">{g.tur === 'egitmen' ? 'Eğitmen Gideri' : 'Genel Gider'} · {fmtTarih(g.tarih)}</div>
                  {g.aciklama && <div className="text-xs text-slate-400 mt-1">{g.aciklama}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-900 text-right min-w-[80px]">{fmtTutar(g.tutar)}</div>
                  <ButtonOutline
                    onClick={() => {
                      setSecili(g.tur === 'egitmen' ? (g.egitmenId || 'genel') : 'genel');
                      setTutar(String(g.tutar));
                      setAciklama(g.aciklama || '');
                      setTarih(g.tarih);
                      setEdit(g);
                      setOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs"
                  >
                    Düzenle
                  </ButtonOutline>
                  <ButtonOutline
                    onClick={() => { if (confirm('Gider silinsin mi?')) deleteGider(g.id); }}
                    className="px-3 py-1.5 text-xs text-red-600 border-red-200"
                  >
                    Sil
                  </ButtonOutline>
                </div>
              </div>
            );
          })}
          {giderler.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">Henüz gider eklenmemiş.</div>
          )}
        </div>
      </div>
      {open && (
        <ModalShell
          title={edit ? 'Gider Düzenle' : 'Yeni Gider'}
          onClose={() => setOpen(false)}
          footer={
            <>
              <ButtonOutline onClick={() => setOpen(false)}>İptal</ButtonOutline>
              <Button
                onClick={() => {
                  if (!tutar) return;
                  const isEg = secili !== 'genel';
                  const data = {
                    tur: isEg ? 'egitmen' : 'genel',
                    egitmenId: isEg ? secili : undefined,
                    tutar: parseFloat(tutar) || 0,
                    tarih,
                    aciklama: aciklama || undefined,
                  };
                  if (edit) editGider(edit.id, data); else addGider(data);
                  setOpen(false);
                }}
              >
                Kaydet
              </Button>
            </>
          }
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tür</label>
            <select
              className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
              value={secili}
              onChange={(e) => setSecili(e.target.value)}
            >
              <option value="genel">Genel</option>
              {egitmenler.map((e) => (
                <option key={e.id} value={e.id}>{adSoyad(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tutar</label>
            <NumericInput value={tutar} onChange={setTutar} placeholder="0" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama</label>
            <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={aciklama} onChange={(e) => setAciklama(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
            <input type="date" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
        </ModalShell>
      )}
    </div>
  );
}
