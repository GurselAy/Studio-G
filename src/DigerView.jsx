import React, { useState } from 'react';
import TrainersView from './TrainersView';
import ServicesView from './ServicesView';
import RaporView from './RaporView';
import EgitmenKazancView from './EgitmenKazancView';
import IstatistikView from './IstatistikView';
import GiderView from './GiderView';
import KarZararView from './KarZararView';
import { supabase } from './supabaseClient';

export default function DigerView({ userRole }) {
  const [subTab, setSubTab] = useState(userRole==='Admin'?'egitmenler':'hizmetler');
  const isAdmin = userRole === 'Admin';
  const cikisYap = async()=>{ await supabase.auth.signOut(); };
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b">
        <h1 className="text-[18px] font-extrabold text-slate-900">Diğer</h1>
        <p className="text-[11px] font-bold text-slate-500">{isAdmin?'Yönetim ve raporlar':'Menü'} • {userRole}</p>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          <button onClick={()=>setSubTab('hizmetler')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='hizmetler'?'bg-slate-900 text-white':'bg-slate-100'}`}>Hizmetler</button>
          {isAdmin && <>
            <button onClick={()=>setSubTab('egitmenler')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='egitmenler'?'bg-slate-900 text-white':'bg-slate-100'}`}>Eğitmenler</button>
            <button onClick={()=>setSubTab('gider')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='gider'?'bg-slate-900 text-white':'bg-slate-100'}`}>Giderler</button>
            <button onClick={()=>setSubTab('ciro')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='ciro'?'bg-slate-900 text-white':'bg-slate-100'}`}>Ciro</button>
            <button onClick={()=>setSubTab('hakediş')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='hakediş'?'bg-slate-900 text-white':'bg-slate-100'}`}>Hakediş</button>
            <button onClick={()=>setSubTab('karzarar')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='karzarar'?'bg-[#5b46f5] text-white':'bg-indigo-50 text-[#5b46f5]'}`}>Kar/Zarar</button>
            <button onClick={()=>setSubTab('istatistik')} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${subTab==='istatistik'?'bg-[#5b46f5] text-white':'bg-indigo-50 text-[#5b46f5]'}`}>İstatistik</button>
          </>}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {subTab==='hizmetler' && <ServicesView />}
        {isAdmin && subTab==='egitmenler' && <TrainersView />}
        {isAdmin && subTab==='gider' && <GiderView />}
        {isAdmin && subTab==='ciro' && <RaporView />}
        {isAdmin && subTab==='hakediş' && <EgitmenKazancView />}
        {isAdmin && subTab==='karzarar' && <KarZararView />}
        {isAdmin && subTab==='istatistik' && <IstatistikView />}
      </div>
      <div className="p-3 bg-white border-t"><button onClick={cikisYap} className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-extrabold">Çıkış Yap</button></div>
    </div>
  );
}