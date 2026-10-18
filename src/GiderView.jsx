import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { Plus, Trash, X } from './Icons.jsx';

const GENEL_KATEGORILER = [
  'Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet',
  'Temizlik', 'Bakım', 'Sigorta', 'Muhasebe', 'Vergi', 'Genel'
];

export default function GiderView() {
  const [list, setList] = useState([]);
  const [egitmenler, setEgitmenler] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kategori: 'Kira',
    egitmen_id: '',
    tutar: '',
    aciklama: '',
    tarih: new Date().toISOString().slice(0, 10),
    selectValue: 'GENEL|Kira'
  });

  useEffect(() => { getir(); }, []);

  const getir = async () => {
    const { data } = await supabase
      .from('isletme_giderleri')
      .select('*, kullanicilar(adi)')
      .order('tarih', { ascending: false });
    if (data) setList(data);

    const { data: eg } = await supabase
      .from('kullanicilar')
      .select('id, adi')
      .order('adi');
    if (eg) setEgitmenler(eg);
  };

  const handleSelect = (e) => {
    const val = e.target.value;
    const sepIdx = val.indexOf('|');
    if (sepIdx === -1) return;
    const prefix = val.substring(0, sepIdx);
    const rest = val.substring(sepIdx + 1);
    if (prefix === 'GENEL') {
      setForm({ ...form, selectValue: val, kategori: rest, egitmen_id: '' });
    } else if (prefix === 'EGITMEN') {
      const egt = egitmenler.find((x) => x.id === rest);
      setForm({ ...form, selectValue: val, kategori: egt ? egt.adi : rest, egitmen_id: rest });
    }
  };

  const ekle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('isletme_giderleri').insert([{
      kategori: form.kategori,
      aciklama: form.aciklama,
      tutar: parseFloat(form.tutar),
      tarih: form.tarih,
      egitmen_id: form.egitmen_id || null
    }]);
    if (error) { alert(error.message); return; }
    setOpen(false);
    setForm({
      kategori: 'Kira', egitmen_id: '', tutar: '', aciklama: '',
      tarih: new Date().toISOString().slice(0, 10), selectValue: 'GENEL|Kira'
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
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-[16px] font-extrabold">Giderler</h2>
          <p className="text-[11px] font-bold text-slate-500">
            {list.length} kayıt • {list.reduce((s, x) => s + parseFloat(x.tutar), 0).toLocaleString('tr-TR')} TL
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 bg-[#5b46f5] text-white rounded-full flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {list.map((g) => (
          <div key={g.id} className="bg-white p-3 rounded-xl border flex justify-between items-center">
            <div className="text-left">
              <div className="text-[13px] font-extrabold">{g.kullanicilar?.adi || g.kategori}</div>
              <div className="text-[11px] font-bold text-slate-500">
                {g.aciklama || '-'} • {new Date(g.tarih).toLocaleDateString('tr-TR')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-extrabold text-red-600">
                {parseFloat(g.tutar).toLocaleString('tr-TR')} TL
              </span>
              <button onClick={() => sil(g.id)}>
                <Trash className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] font-extrabold">Gider Ekle</h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={ekle} className="mt-3 space-y-3 text-sm">
              <div>
                <label className="text-xs font-extrabold">Kategori</label>
                <select
                  value={form.selectValue}
                  onChange={handleSelect}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
                >
                  <optgroup label="Genel Giderler">
                    {GENEL_KATEGORILER.map((k) => (
                      <option key={k} value={`GENEL|${k}`}>{k}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Eğitmenler">
                    {egitmenler.map((eg) => (
                      <option key={eg.id} value={`EGITMEN|${eg.id}`}>{eg.adi}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-extrabold">Tutar (TL)</label>
                <input
                  required
                  type="tel"
                  inputMode="decimal"
                  placeholder="1500"
                  value={form.tutar}
                  onChange={(e) => setForm({ ...form, tutar: e.target.value.replace(',', '.') })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold">Açıklama</label>
                <input
                  placeholder="Maaş, prim detayı..."
                  value={form.aciklama}
                  onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-extrabold">Tarih</label>
                <input
                  type="date"
                  value={form.tarih}
                  onChange={(e) => setForm({ ...form, tarih: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold max-w-full"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold"
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