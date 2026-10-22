import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { Plus, Clock, Trash, X } from './Icons.jsx';

function ilkHarfBuyuk(s) {
  const t = (s || '').trim();
  if (!t) return t;
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(t)) return t;
  return t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1);
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
      adi: ilkHarfBuyuk(adi),
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
      <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-[16px] font-extrabold text-slate-900">Hizmetler</h2>
          <p className="text-[11px] font-bold text-slate-500">{hizmetler.length} hizmet tanımlı</p>
        </div>
        <button
          onClick={() => setModalAcik(true)}
          className="w-9 h-9 bg-[#5b46f5] text-white rounded-full flex items-center justify-center shadow"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-xs font-bold">Yükleniyor...</div>
        ) : hizmetler.length === 0 ? (
          <div className="text-center py-10 text-xs font-bold text-slate-400">Henüz hizmet yok</div>
        ) : (
          hizmetler.map((h) => (
            <div key={h.id} className="bg-white p-2.5 rounded-xl border shadow-sm flex justify-between items-center">
              <div className="text-left">
                <h3 className="text-[13px] font-extrabold text-slate-900 text-left">{h.adi}</h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {h.sure} dk
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    h.tur === 'Bireysel' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {h.tur} {h.tur === 'Grup' ? `• ${h.katilim_sayisi} kişi` : ''}
                  </span>
                </div>
              </div>
              <button onClick={() => sil(h.id)} className="p-2 text-slate-300 hover:text-red-500">
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      {modalAcik && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <h2 className="text-[15px] font-extrabold text-slate-900">Yeni Hizmet Ekle</h2>
              <button onClick={() => setModalAcik(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={kaydet} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900">Ders Adı</label>
                <input
                  required
                  placeholder="Örn: Pilates"
                  value={adi}
                  onChange={(e) => setAdi(ilkHarfBuyuk(e.target.value))}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Tür</label>
                  <select
                    value={tur}
                    onChange={(e) => setTur(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-extrabold"
                  >
                    <option>Bireysel</option>
                    <option>Grup</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Süre (dk, numeric)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={sure}
                    onChange={(e) => setSure(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-900">Kontenjan (Grup için, numeric)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  max="30"
                  value={kapasite}
                  onChange={(e) => setKapasite(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] text-white rounded-xl text-sm font-extrabold"
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