// Mor header + E-posta/Telefon karti sagda Duzenle + Menu gorseldeki gibi
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import TrainersView from './TrainersView.jsx';
import ServicesView from './ServicesView.jsx';
import RaporView from './RaporView.jsx';
import EgitmenKazancView from './EgitmenKazancView.jsx';
import IstatistikView from './IstatistikView.jsx';
import GiderView from './GiderView.jsx';
import KarZararView from './KarZararView.jsx';
import ProfilView from './ProfilView.jsx';
import { Users, Clock, CreditCard, Mail, Phone, ChevronRight, ChartBar, Trending, Dollar, UserCircle } from './Icons.jsx';

export default function DigerView({ userRole }){
  const isAdmin = userRole==='Admin';
  const [profile,setProfile]=useState(null);
  const [subTab,setSubTab]=useState(null);
  useEffect(()=>{ supabase.auth.getUser().then(async({data})=>{ if(data.user){ const {data:p}=await supabase.from('kullanicilar').select('*').eq('id',data.user.id).single(); if(p) setProfile(p); } }); },[]);
  const menu = [
    { id:'istatistik', label:'İstatistikler', icon: ChartBar, admin:true },
    { id:'egitmenler', label:'Eğitmenler', icon: Users, admin:true },
    { id:'hakediş', label:'Eğitmen Raporları', icon: Trending, admin:true },
    { id:'gider', label:'Giderler', icon: Clock, admin:true },
    { id:'karzarar', label:'Kar / Zarar', icon: Dollar, admin:true },
    { id:'hizmetler', label:'Hizmetler', icon: Clock, admin:false },
  ];
  const filteredMenu = menu.filter(m=> isAdmin ? true : !m.admin);
  if(subTab){
    const CompMap = { egitmenler: TrainersView, hizmetler: ServicesView, ciro: RaporView, 'hakediş': EgitmenKazancView, istatistik: IstatistikView, gider: GiderView, karzarar: KarZararView, profil: ProfilView };
    const Comp = CompMap[subTab];
    return (<div className="flex flex-col h-full bg-slate-50"><div className="bg-white p-3 border-b flex items-center gap-2"><button onClick={()=>setSubTab(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold">‹</button><h2 className="text-[15px] font-extrabold">{subTab==='profil'?'Profilim': filteredMenu.find(m=>m.id===subTab)?.label || subTab}</h2></div><div className="flex-1 overflow-hidden"><Comp /></div></div>);
  }
  return (
    <div className="flex flex-col h-full bg-[#f6f5ff] overflow-y-auto">
      <div className="bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6366f1] pt-8 pb-12 px-4 text-center">
        <div className="w-16 h-16 bg-white/25 rounded-full flex items-center justify-center mx-auto"><UserCircle className="w-10 h-10 text-white" /></div>
        <h2 className="text-[18px] font-extrabold text-slate-900 mt-3">{profile?.adi || 'Yönetici'}</h2>
        <p className="text-[11px] font-bold text-white/90 mt-1">{profile?.rol || userRole}</p>
      </div>
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3">
          <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center"><Mail className="w-4 h-4 text-[#5b46f5]" /></div><div className="text-left"><div className="text-[10px] font-bold text-slate-400">E-posta</div><div className="text-[12px] font-extrabold">{profile?.email || '-'}</div></div></div><button onClick={()=>setSubTab('profil')} className="text-[11px] font-extrabold text-[#5b46f5] bg-indigo-50 px-3 py-1.5 rounded-full">Düzenle</button></div>
          <div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center"><Phone className="w-4 h-4 text-[#5b46f5]" /></div><div className="text-left"><div className="text-[10px] font-bold text-slate-400">Telefon</div><div className="text-[12px] font-extrabold">{profile?.telefon || '-'}</div></div></div><button onClick={()=>setSubTab('profil')} className="text-[11px] font-extrabold text-[#5b46f5] bg-indigo-50 px-3 py-1.5 rounded-full">Şifre Değiştir</button></div>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {filteredMenu.map((item, idx)=>{
            const Icon=item.icon;
            return (<button key={item.id} onClick={()=>setSubTab(item.id)} className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 ${idx!==filteredMenu.length-1?'border-b border-slate-50':''}`}><div className="flex items-center gap-3"><Icon className="w-5 h-5 text-slate-500" /><span className="text-[14px] font-extrabold">{item.label}</span></div><ChevronRight className="w-4 h-4 text-slate-400" /></button>);
          })}
        </div>
        <div className="bg-white rounded-2xl border shadow-sm"><button onClick={async()=>{await supabase.auth.signOut();}} className="w-full flex items-center gap-3 p-4 text-left"><span className="text-red-500">↪</span><span className="text-[14px] font-extrabold text-red-600">Çıkış Yap</span></button></div>
        <div className="text-center text-[11px] font-bold text-slate-300 py-2">Studio G v2.0.0</div>
      </div>
    </div>
  );
}