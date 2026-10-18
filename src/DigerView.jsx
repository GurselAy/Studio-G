import React, { useState } from 'react';
import { Button, adSoyad } from './App';
import ProfilView from './ProfilView';

const menuAdmin = [
  { key: 'hizmetler', label: 'Hizmetler', icon: '💇' },
  { key: 'egitmenler', label: 'Eğitmenler', icon: '👩‍🏫' },
  { key: 'egitmen-raporlari', label: 'Eğitmen Raporları', icon: '📊' },
  { key: 'giderler', label: 'Giderler', icon: '💸' },
  { key: 'karzarar', label: 'Kar/Zarar', icon: '⚖️' },
  { key: 'istatistik', label: 'İstatistik', icon: '📈' },
];

export default function DigerView({ user, role, setActiveScreen }) {
  const [profilOpen, setProfilOpen] = useState(false);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="relative p-6 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-700" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Hesabım</h2>
            <p className="text-violet-100 text-sm mt-1">{user?.email || '-'}</p>
            <p className="text-violet-200 text-xs mt-1 md:hidden">{adSoyad(user || {})}</p>
            <p className="text-violet-200 text-xs mt-1 md:hidden">{user?.telefon || '-'}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="hidden md:block text-right">
              <div className="font-semibold text-sm">{adSoyad(user || {})}</div>
              <div className="text-xs text-violet-200">{user?.telefon || '-'}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border border-white/30">
              {(user?.adSoyad?.charAt(0) || 'U').toUpperCase()}
            </div>
            <Button
              onClick={() => setProfilOpen(true)}
              className="text-xs px-3 py-1.5 bg-white/15 border border-white/30 text-white hover:bg-white/25"
            >
              Düzenle
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {role === 'admin' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuAdmin.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveScreen(item.key)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left hover:bg-violet-50 hover:border-violet-200 transition flex flex-col gap-2 shadow-sm"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold text-slate-900">{item.label}</span>
                <span className="text-xs text-slate-500">{item.label.toLowerCase()}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400 text-sm">
            Eğitmen için bu menüde görüntülenecek ek bir içerik yok.
          </div>
        )}
      </div>

      {profilOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setProfilOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <ProfilView embedded user={user} onClose={() => setProfilOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
