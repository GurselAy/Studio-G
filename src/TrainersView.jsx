import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, fmtTutar, adSoyad } from './App';

export default function TrainersView({ egitmenler, hizmetler, setActiveScreen, addEgitmen, editEgitmen, deleteEgitmen }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
        <span className="font-bold text-slate-900">Eğitmenler</span>
        <Button onClick={() => { setEdit(null); setOpen(true); }} className="px-3 py-1.5 text-xs">
          + Eğitmen
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          {egitmenler.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900">{adSoyad(e)}</div>
                  <div className="text-xs text-slate-500">{e.email || '-'} · {e.telefon || '-'}</div>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Seans Ücretleri</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                {hizmetler.map((h) => (
                  <div key={h.id} className="p-2 rounded border border-slate-200 bg-slate-50">
                    <div className="text-[10px] text-slate-500 truncate">{h.ad}</div>
                    <div className="font-semibold text-slate-900">{fmtTutar(e.hizmetUcretleri[h.id] || 0)}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <ButtonOutline
                  onClick={() => { setEdit(e); setOpen(true); }}
                  className="flex-1 text-xs"
                >
                  Düzenle (ücretler)
                </ButtonOutline>
                <ButtonOutline
                  onClick={() => { if (confirm(adSoyad(e) + ' silinsin mi?')) deleteEgitmen(e.id); }}
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
        <EgitmenFormModal
          egitmen={edit}
          hizmetler={hizmetler}
          onClose={() => setOpen(false)}
          onSave={(e) => {
            if (edit) editEgitmen(edit.id, e); else addEgitmen(e);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function EgitmenFormModal({ egitmen, hizmetler, onClose, onSave }) {
  const [ad, setAd] = useState(egitmen?.ad || '');
  const [soyad, setSoyad] = useState(egitmen?.soyad || '');
  const [telefon, setTelefon] = useState(egitmen?.telefon || '');
  const [email, setEmail] = useState(egitmen?.email || '');
  const [sifre, setSifre] = useState('');
  const [ucretler, setUcretler] = useState(() => {
    const obj = {};
    hizmetler.forEach((h) => {
      obj[h.id] = String(egitmen?.hizmetUcretleri?.[h.id] ?? h.fiyat);
    });
    return obj;
  });

  return (
    <ModalShell
      title={egitmen ? 'Eğitmen Düzenle' : 'Yeni Eğitmen'}
      onClose={onClose}
      footer={
        <>
          <ButtonOutline onClick={onClose}>İptal</ButtonOutline>
          <Button
            onClick={() => {
              const num = {};
              hizmetler.forEach((h) => { num[h.id] = parseFloat(ucretler[h.id]) || 0; });
              onSave({ ad, soyad, telefon, email, hizmetUcretleri: num });
            }}
          >
            {egitmen ? 'Güncelle' : 'Kaydet'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Ad</label>
          <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={ad} onChange={(e) => setAd(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Soyad</label>
          <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={soyad} onChange={(e) => setSoyad(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta (giriş için)</label>
        <input type="email" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
        <NumericInput value={telefon} onChange={setTelefon} placeholder="0530 000 00 00" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
      </div>
      {!egitmen && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Şifre (giriş için)</label>
          <input type="password" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="••••••" />
        </div>
      )}
      <div className="border border-slate-200 rounded-xl p-3">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Hizmet Bazlı Seans Ücretleri</div>
        <div className="space-y-3">
          {hizmetler.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{h.ad}</span>
              <NumericInput
                value={ucretler[h.id] || ''}
                onChange={(v) => setUcretler((p) => ({ ...p, [h.id]: v }))}
                placeholder="0"
                className="w-28 rounded-lg px-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none text-right"
              />
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
