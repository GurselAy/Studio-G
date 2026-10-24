import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { Plus, Trash, X } from './Icons.jsx';

const GENEL_KATEGORILER = [
  'Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet',
  'Temizlik', 'Bakım', 'Sigorta', 'Muhasebe', 'Vergi', 'Genel',
];

export default function GiderView() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kategori: 'Kira',
    tutar: '',
    aciklama: '',
    tarih: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => { getir(); }, []);

  const getir = async () => {
    const { data } = await supabase
      .from('isletme_giderleri')
      .select('*, kullanicilar(adi)')
      .order('tarih', { ascending: false });
    if (data) setList(data);
  };

  const ekle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('isletme_giderleri').insert([{
      kategori: form.kategori,
      aciklama: form.aciklama,
      tutar: parseFloat(form.tutar) || 0,
      tarih: form.tarih,
      egitmen_id: null,
    }]);
    if (error) { alert(error.message); return; }
    setOpen(false);
    setForm({
      kategori: 'Kira', tutar: '', aciklama: '',
      tarih: new Date().toISOString().slice(0, 10),
    });
    getir();
  };

  const sil = async (id) => {
    if (!confirm('Silinsin mi?')) return;
    await supabase.from('isletme_giderleri').delete().eq('id', id);
    getir();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 md:px-5 md:py-4 border-b flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[16px] md:text-[18px] font-extrabold">Giderler</h2>
          <p className="text-[11px] md:text-[12px] font-bold text-slate-500">
            {list.length} kayıt • {list.reduce((s, x) => s + parseFloat(x.tutar || 0), 0).toLocaleString('tr-TR')} TL
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 md:w-auto md:h-auto md:px-4 md:py-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-full md:rounded-xl flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline text-[12px] font-extrabold">Yeni Gider</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:auto-rows-min md:content-start">
        {list.map((g) => (
          <div key={g.id} className="bg-white p-3 md:p-4 rounded-xl border flex justify-between items-center md:hover:shadow-md md:hover:border-indigo-200 transition">
            <div className="text-left min-w-0">
              <div className="text-[13px] md:text-[14px] font-extrabold truncate">{g.kullanicilar?.adi || g.kategori}</div>
              <div className="text-[11px] md:text-[12px] font-bold text-slate-500 truncate">
                {g.aciklama || '-'} • {new Date(g.tarih).toLocaleDateString('tr-TR')}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] md:text-[14px] font-extrabold text-red-600">
                {parseFloat(g.tutar || 0).toLocaleString('tr-TR')} TL
              </span>
              <button onClick={() => sil(g.id)} className="p-1 md:hover:bg-red-50 rounded-full transition">
                <Trash className="w-4 h-4 text-slate-300 md:hover:text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 md:p-6 max-h-[90dvh] md:max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold">Gider Ekle</h2>
              <button onClick={() => setOpen(false)} className="md:hover:bg-slate-100 md:rounded-full md:p-1 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={ekle} className="mt-3 space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 text-sm">
              <div>
                <label className="text-xs md:text-[13px] font-extrabold">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold md:text-[14px] md:hover:border-slate-300 transition"
                >
                  {GENEL_KATEGORILER.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs md:text-[13px] font-extrabold">Tutar (TL, numeric)</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1500"
                  value={form.tutar}
                  onChange={(e) => setForm({ ...form, tutar: e.target.value.replace(/[^\d.]/g, '') })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold md:text-[14px]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs md:text-[13px] font-extrabold">Açıklama</label>
                <input
                  placeholder="Detay (isteğe bağlı)"
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold md:text-[14px]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs md:text-[13px] font-extrabold">Tarih</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold max-w-full md:text-[14px]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl font-extrabold md:text-[14px] transition md:col-span-2"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
