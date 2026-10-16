// CalendarView.jsx - Studio G ana konteyner
// - userRole çeker, DigerView ve ClientsView'e gönderir
// - takvimData = sadece planlandı, ajandaData = Admin hepsi, Eğitmen tamamlandı hariç
// - DigerView çağrısı: <DigerView userRole={userRole} /> burada
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TakvimView from './TakvimView';
import AjandaView from './AjandaView';
import ClientsView from './ClientsView';
import DigerView from './DigerView';
import NewAppointmentModal from './NewAppointmentModal';
import RandevuDetailModal from './RandevuDetailModal';
import { CalendarIcon, Users, Clock, Plus, ChevronLeft, ChevronRight } from './Icons';

export default function CalendarView() {
  const [aktifSekme, setAktifSekme] = useState('takvim');
  const [secilenTarih, setSecilenTarih] = useState(new Date().toISOString().split('T')[0]);
  const [secilenEgitmen, setSecilenEgitmen] = useState('tumu');
  const [randevular, setRandevular] = useState([]);
  const [egitmenler, setEgitmenler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [secilenRandevu, setSecilenRandevu] = useState(null);
  const [detayAcik, setDetayAcik] = useState(false);
  const [userRole, setUserRole] = useState('Eğitmen');
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('kullanicilar').select('rol').eq('id', user.id).single();
        if (data) setUserRole(data.rol);
      }
    };
    getRole();
  }, []);

  useEffect(() => { veriGetir(); }, [secilenTarih, secilenEgitmen]);

  const veriGetir = async () => {
    setLoading(true);
    const { data: egitmenData } = await supabase.from('kullanicilar').select('id, adi');
    if (egitmenData) setEgitmenler(egitmenData);
    let query = supabase.from('randevular').select(`id, musteri_id, hizmet_id, egitmen_id, baslangic_saati, bitis_saati, durum, egitmen_ucret, grup_id, musteriler (adi, telefon), hizmetler (adi, tur, katilim_sayisi), kullanicilar (adi)`).gte('baslangic_saati', `${secilenTarih}T00:00:00`).lte('baslangic_saati', `${secilenTarih}T23:59:59`).order('baslangic_saati');
    if (secilenEgitmen !== 'tumu') query = query.eq('egitmen_id', secilenEgitmen);
    const { data } = await query; if (data) setRandevular(data); setLoading(false);
  };

  const tarihArttir = (g) => { const d = new Date(secilenTarih); d.setDate(d.getDate() + g); setSecilenTarih(d.toISOString().split('T')[0]); };
  const buguneDon = () => setSecilenTarih(todayStr);
  const getWeekDays = (s) => { const date = new Date(s); const diff = date.getDay()===0?-6:1-date.getDay(); const mon = new Date(date); mon.setDate(date.getDate()+diff); return Array.from({length:7},(_,i)=>{ const d=new Date(mon); d.setDate(mon.getDate()+i); return d; }); };
  const weekDays = getWeekDays(secilenTarih);
  const weekLabels = ['PZT','SAL','ÇAR','PER','CUM','CMT','PAZ'];
  const formatBaslik = (t) => { const d = new Date(t); return { gunAy: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }), haftagun: d.toLocaleDateString('tr-TR', { weekday: 'long' }), tam: d.toLocaleDateString('tr-TR') }; };
  const { gunAy, haftagun, tam } = formatBaslik(secilenTarih);
  const randevuTikla = (r) => { setSecilenRandevu(r); setDetayAcik(true); };

  const takvimRandevular = randevular.filter(r => r.durum === 'planlandı');
  const ajandaRandevular = userRole === 'Admin' ? randevular : randevular.filter(r => r.durum !== 'tamamlandı');

  return (
    <div className="flex flex-col h-screen bg-[#f6f5ff] max-w-md mx-auto shadow-2xl overflow-hidden">
      <div className="bg-white px-4 py-3 flex justify-between items-center border-b"><div className="flex items-center gap-2.5"><div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] rounded-xl flex items-center justify-center text-white font-extrabold">G</div><span className="font-extrabold text-[16px] text-slate-900">Studio G</span><span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full ml-2">{userRole}</span></div><button onClick={()=>setModalAcik(true)} className="bg-[#5b46f5] text-white px-4 py-1.5 rounded-full text-xs font-extrabold">+ Randevu</button></div>
      {(aktifSekme==='takvim'||aktifSekme==='ajanda') && (<div className="bg-white border-b"><div className="px-3 py-2 flex justify-between items-center"><span className="text-[13px] font-extrabold capitalize">{gunAy} {haftagun} {tam}</span><div className="flex gap-1.5"><button onClick={buguneDon} className="text-[11px] font-extrabold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">Bugün</button><button onClick={()=>tarihArttir(-1)} className="w-7 h-7 border rounded-full flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button><button onClick={()=>tarihArttir(1)} className="w-7 h-7 border rounded-full flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button></div></div><div className="px-2 pb-2.5 grid grid-cols-7 gap-1">{weekDays.map((d,i)=>{ const iso=d.toISOString().split('T')[0]; return <button key={i} onClick={()=>setSecilenTarih(iso)} className={`py-2 rounded-xl text-center ${iso===secilenTarih?'bg-[#5b46f5] text-white':'bg-[#f8f7ff] text-slate-600'}`}><div className="text-[9px] font-extrabold">{weekLabels[i]}</div><div className="text-[13px] font-extrabold">{d.getDate()}</div></button> })}</div></div>)}
      <div className="flex-1 overflow-hidden">
        {aktifSekme==='takvim' && <TakvimView secilenTarih={secilenTarih} setSecilenTarih={setSecilenTarih} egitmenler={egitmenler} randevular={takvimRandevular} onRandevuClick={randevuTikla} />}
        {aktifSekme==='ajanda' && <AjandaView secilenTarih={secilenTarih} setSecilenTarih={setSecilenTarih} secilenEgitmen={secilenEgitmen} setSecilenEgitmen={setSecilenEgitmen} egitmenler={egitmenler} randevular={ajandaRandevular} loading={loading} veriGetir={veriGetir} onRandevuClick={randevuTikla} />}
        {aktifSekme==='musteriler' && <ClientsView userRole={userRole} />}
        {aktifSekme==='diger' && <DigerView userRole={userRole} />}
      </div>
      <NewAppointmentModal isOpen={modalAcik} onClose={()=>setModalAcik(false)} onSuccess={veriGetir} secilenTarih={secilenTarih} />
      <RandevuDetailModal isOpen={detayAcik} onClose={()=>setDetayAcik(false)} randevu={secilenRandevu} onSuccess={veriGetir} egitmenler={egitmenler} />
      <div className="bg-white border-t px-2 py-1 flex justify-around">
        <button onClick={()=>setAktifSekme('takvim')} className={`flex flex-col items-center p-1.5 ${aktifSekme==='takvim'?'text-[#5b46f5]':'text-slate-400'}`}><CalendarIcon className="w-6 h-6" /><span className="text-[10px] font-extrabold">Takvim</span></button>
        <button onClick={()=>setAktifSekme('ajanda')} className={`flex flex-col items-center p-1.5 ${aktifSekme==='ajanda'?'text-[#5b46f5]':'text-slate-400'}`}><Clock className="w-6 h-6" /><span className="text-[10px] font-extrabold">Ajanda</span></button>
        <button onClick={()=>setModalAcik(true)} className="flex flex-col items-center p-1"><div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center"><Plus className="w-5 h-5" /></div><span className="text-[10px] font-extrabold">Yeni</span></button>
        <button onClick={()=>setAktifSekme('musteriler')} className={`flex flex-col items-center p-1.5 ${aktifSekme==='musteriler'?'text-[#5b46f5]':'text-slate-400'}`}><Users className="w-6 h-6" /><span className="text-[10px] font-extrabold">Müşteriler</span></button>
        <button onClick={()=>setAktifSekme('diger')} className={`flex flex-col items-center p-1.5 ${aktifSekme==='diger'?'text-[#5b46f5]':'text-slate-400'}`}><Clock className="w-6 h-6" /><span className="text-[10px] font-extrabold">Diğer</span></button>
      </div>
    </div>
  );
}