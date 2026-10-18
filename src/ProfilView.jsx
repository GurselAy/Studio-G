import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput } from './App';

export default function ProfilView({ user, setActiveScreen, updateUser, embedded, onClose }) {
  const [adSoyadV, setAdSoyadV] = useState(user?.adSoyad || '');
  const [telefonV, setTelefonV] = useState(user?.telefon || '');
  const [emailV, setEmailV] = useState(user?.email || '');
  const [sifreV, setSifreV] = useState('');

  const body = (
    <>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Ad Soyad</label>
        <input
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={adSoyadV}
          onChange={(e) => setAdSoyadV(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta</label>
        <input
          type="email"
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={emailV}
          onChange={(e) => setEmailV(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
        <NumericInput
          value={telefonV}
          onChange={setTelefonV}
          placeholder="0530 000 00 00"
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Yeni Şifre (opsiyonel)</label>
        <input
          type="password"
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={sifreV}
          onChange={(e) => setSifreV(e.target.value)}
          placeholder="Boş bırakırsanız değişmez"
        />
      </div>
    </>
  );

  const footer = (
    <>
      <ButtonOutline onClick={embedded ? onClose : () => setActiveScreen && setActiveScreen('diger')}>
        İptal
      </ButtonOutline>
      <Button
        onClick={() => {
          if (updateUser) updateUser({ adSoyad: adSoyadV, telefon: telefonV, email: emailV });
          if (embedded && onClose) onClose();
          if (!embedded && setActiveScreen) setActiveScreen('diger');
        }}
      >
        Kaydet
      </Button>
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Profili Düzenle</h3>
        </div>
        <div className="p-6 space-y-4">{body}</div>
        <div className="p-6 border-t border-slate-100 flex justify-end gap-2">{footer}</div>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <ButtonOutline onClick={() => setActiveScreen && setActiveScreen('diger')} className="px-3 py-1.5 text-xs">
          ← Menü
        </ButtonOutline>
        <span className="font-bold text-slate-900">Profil</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
        <ModalShell title="Profili Düzenle" onClose={onClose || (() => setActiveScreen('diger'))} footer={footer}>
          {body}
        </ModalShell>
      </div>
    </div>
  );
}
