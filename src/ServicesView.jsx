import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { Plus, Clock, Trash, X } from './Icons.jsx';

function ilkHarfBuyuk(s) {
  const t = s || '';
  if (!t) return t;
  const first = t.charAt(0);
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(first)) return t;
  return first.toLocaleUpperCase('tr-TR') + t.slice(1);
}

export default function ServicesView() {
  const [hizmetler, setHizmetler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [adi, setAdi] = useState('');
  const [tur, setTur] = useState('Bireysel');
  const [sure, setSure] = useState(50);
  const [kapasite, setKapasite] = useState(1);

  useEffect(() => { getir(); }, []);
  const getir = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('hizmetler')
      .select('*')
      .order('adi', { ascending: true })
      .order('tur', { ascending: true })
      .order('katilim_sayisi', { ascending: true });
    if (data) setHizmetler(data);
    setLoading(false);
  };
  const kaydet = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('hizmetler').insert([{
      adi: ilkHarfBuyuk(adi).trim(),
      tur,
      sure: parseInt(sure) || 50,
      katilim_sayisi: parseInt(kapasite) || 1,
    }]);
    if (!error) {
      setAdi('');
      setModalAcik(false);
      getir();
    } else {
      alert('Hata: ' + error.message);
    }
  };
  const sil = async (id) => {
    if (!window.confirm('Silinsin mi?')) return;
    const { count } = await supabase.from('randevular').select('*', { count: 'exact', head: true }).eq('hizmet_id', id);
    if (count > 0) { alert('Bu hizmetin randevuları var'); return; }
    await supabase.from('egitmen_hizmet_ucretleri').delete().eq('hizmet_id', id);
    await supabase.from('hizmetler').delete().eq('id', id);
    getir();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 md:px-5 md:py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[16px] md:text-[18px] font-extrabold text-slate-900">Hizmetler</h2>
          <p className="text-[11px] md:text-[12px] font-bold text-slate-500">{hizmetler.length} hizmet tanımlı</p>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="w-9 h-9 md:w-auto md:h-auto md:px-4 md:py-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-full md:rounded-xl flex items-center justify-center gap-1.5 shadow transition"
        >
          <Plus className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline text-[12px] font-extrabold">Yeni Hizmet</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:auto-rows-min md:content-start">
        {loading ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold md:col-span-full">Yükleniyor...</div>
        ) : hizmetler.length === 0 ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold text-slate-400 md:col-span-full">Henüz hizmet yok</div>
        ) : (
          hizmetler.map((h) => (
            <div key={h.id} className="bg-white p-2.5 md:p-4 rounded-xl border shadow-sm flex justify-between items-center md:hover:shadow-md md:hover:border-indigo-200 transition">
              <div className="text-left min-w-0">
                <h3 className="text-[13px] md:text-[14px] font-extrabold text-slate-900 text-left truncate">{h.adi}</h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] md:text-[12px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {h.sure} dk
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-extrabold ${
                    h.tur === 'Bireysel' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {h.tur} {h.tur === 'Grup' ? `• ${h.katilim_sayisi} kişi` : ''}
                  </span>
                </div>
              </div>
              <button onClick={() => sil(h.id)} className="p-2 text-slate-300 hover:text-red-500 md:hover:bg-red-50 rounded-full transition shrink-0">
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      {modalAcik && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4 md:p-6">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 md:p-6 max-h-[90dvh] md:max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold text-slate-900">Yeni Hizmet Ekle</h2>
              <button onClick={() => setModalAcik(false)} className="md:hover:bg-slate-100 md:rounded-full md:p-1 transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={kaydet} className="mt-3 space-y-3">
              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Ders Adı</label>
                <input
                  required
                  placeholder="Örn: Pilates"
                  value={adi}
                  onChange={(e) => setAdi(ilkHarfBuyuk(e.target.value))}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-sm md:text-[14px] font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Tür</label>
                  <select
                    value={tur}
                    onChange={(e) => setTur(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs md:text-[13px] font-extrabold md:hover:border-slate-300 transition"
                  >
                    <option>Bireysel</option>
                    <option>Grup</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Süre (dk, numeric)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={sure}
                    onChange={(e) => setSure(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs md:text-[13px] font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Kontenjan (Grup için, numeric)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="30"
                  value={kapasite}
                  onChange={(e) => setKapasite(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs md:text-[13px] font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl text-sm md:text-[14px] font-extrabold transition"
              >
                Ekle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
