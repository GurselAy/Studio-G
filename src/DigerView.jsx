import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import TrainersView from './TrainersView.jsx';
import ServicesView from './ServicesView.jsx';
import EgitmenKazancView from './EgitmenKazancView.jsx';
import IstatistikView from './IstatistikView.jsx';
import GiderView from './GiderView.jsx';
import KarZararView from './KarZararView.jsx';
import ProfilView from './ProfilView.jsx';
import HatirlatmalarView from './HatirlatmalarView.jsx';
import YedekView from './YedekView.jsx';
import { Mail, Phone, ChevronRight, ChartBar, Trending, Dollar, Users, Clock, MessageSquare } from './Icons.jsx';

const YedekIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default function DigerView({ userRole }) {
  const isAdmin = userRole === 'Admin';
  const [profile, setProfile] = useState(null);
  const [subTab, setSubTab] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase
          .from('kullanicilar')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (p) setProfile(p);
      }
    });
  }, []);

  // Herkesin gördüğü menü
  const menuHerkes = [
    { id: 'hatirlatma', label: 'Hatırlatmalar', icon: MessageSquare },
  ];

  const menuAdmin = [
    { id: 'hizmetler', label: 'Hizmetler', icon: Clock },
    { id: 'egitmenler', label: 'Eğitmenler', icon: Users },
    { id: 'hakedis', label: 'Eğitmen Raporları', icon: Trending },
    { id: 'gider', label: 'Giderler', icon: Clock },
    { id: 'karzarar', label: 'Kar / Zarar', icon: Dollar },
    { id: 'istatistik', label: 'İstatistik', icon: ChartBar },
    { id: 'yedek', label: 'Yedek (CSV)', icon: YedekIcon },
  ];

  const tumMenu = [...menuHerkes, ...menuAdmin];
  const filteredMenu = isAdmin ? tumMenu : menuHerkes;

  if (subTab) {
    const CompMap = {
      egitmenler: TrainersView,
      hizmetler: ServicesView,
      hakedis: EgitmenKazancView,
      istatistik: IstatistikView,
      gider: GiderView,
      karzarar: KarZararView,
      profil: ProfilView,
      hatirlatma: HatirlatmalarView,
      yedek: YedekView,
    };
    const Comp = CompMap[subTab];
    if (!Comp) {
      setSubTab(null);
      return null;
    }
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-3 border-b flex items-center gap-2">
          <button
            onClick={() => setSubTab(null)}
            className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold"
          >
            ‹
          </button>
          <h2 className="text-[15px] font-extrabold">
            {subTab === 'profil' ? 'Profilim' : tumMenu.find((m) => m.id === subTab)?.label || subTab}
          </h2>
        </div>
        <div className="flex-1 overflow-hidden">
          {subTab === 'profil' ? (
            <ProfilView embedded paket={null} musteri={null} onClose={() => setSubTab(null)} onSuccess={() => {}} />
          ) : (
            <Comp />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f6f5ff] overflow-y-auto">
      <div className="bg-[#f59a00] pt-8 pb-12 px-4 text-center">
        <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl text-white font-extrabold">
            {(profile?.adi || 'Y').charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-[18px] font-extrabold text-slate-900 mt-3">
          {profile?.adi || 'Yönetici'}
        </h2>
        <p className="text-[11px] font-bold text-white/90 mt-1">
          {profile?.rol || userRole}
        </p>
      </div>
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          {/* E-posta satırı - sadece bilgi */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-[#5b46f5]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-400">E-posta</div>
              <div className="text-[12px] font-extrabold truncate">{profile?.email || '-'}</div>
            </div>
          </div>
          {/* Telefon satırı - sadece bilgi */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-[#5b46f5]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="text-[10px] font-bold text-slate-400">Telefon</div>
              <div className="text-[12px] font-extrabold truncate">{profile?.telefon || '-'}</div>
            </div>
          </div>
          {/* TEK Düzenle butonu - tam ortada */}
          <button
            onClick={() => setSubTab('profil')}
            className="w-full mt-2 py-2.5 bg-[#5b46f5] text-white rounded-xl font-extrabold text-sm"
          >
            Profili Düzenle
          </button>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        {filteredMenu.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-400 text-sm">
            Eğitmen için bu menüde görüntülenecek içerik yok.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {filteredMenu.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSubTab(item.id)}
                  className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 ${
                    idx !== filteredMenu.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-500" />
                    <span className="text-[14px] font-extrabold">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              );
            })}
          </div>
        )}
        <div className="bg-white rounded-2xl border shadow-sm">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <span className="text-red-500">↪</span>
            <span className="text-[14px] font-extrabold text-red-600">Çıkış Yap</span>
          </button>
        </div>
        <div className="text-center text-[11px] font-bold text-slate-300 py-2">Studio G v1.0.0</div>
      </div>
    </div>
  );
}