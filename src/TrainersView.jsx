import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash, Edit, X, Phone, MessageSquare } from './Icons.jsx';

const secondary = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export default function TrainersView() {
  const [list, setList] = useState([]);
  const [hizmetler, setHizmetler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ adi: '', telefon: '', email: '', sifre: '', rol: 'Eğitmen' });
  const [ucretler, setUcretler] = useState({});
  const [hata, setHata] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => { getir(); }, []);

  const getir = async () => {
    setLoading(true);
    const { data: kullanicilar } = await supabase.from('kullanicilar').select('*').order('adi');
    if (kullanicilar) setList(kullanicilar);
    const { data: h } = await supabase.from('hizmetler').select('*').order('adi');
    if (h) {
      setHizmetler(h);
      const u = {};
      h.forEach((x) => { u[x.id] = '0'; });
      setUcretler(u);
    }
    setLoading(false);
  };

  const yeniEkle = () => {
    setEditId(null);
    setForm({ adi: '', telefon: '', email: '', sifre: '', rol: 'Eğitmen' });
    const u = {};
    hizmetler.forEach((h) => { u[h.id] = '0'; });
    setUcretler(u);
    setHata('');
    setInfo('');
    setOpen(true);
  };

  const duzenle = (egitmen) => {
    setEditId(egitmen.id);
    setForm({ adi: egitmen.adi, telefon: egitmen.telefon || '', email: egitmen.email || '', sifre: '', rol: egitmen.rol });
    const u = {};
    hizmetler.forEach((h) => {
      const v = egitmen.hizmet_ucretleri?.[h.id];
      u[h.id] = v != null ? String(v) : '0';
    });
    setUcretler(u);
    setHata('');
    setInfo('');
    setOpen(true);
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setHata('');
    setInfo('');

    const hizmetUcretleriObj = {};
    hizmetler.forEach((h) => {
      const v = parseFloat(ucretler[h.id]);
      if (!isNaN(v) && v > 0) hizmetUcretleriObj[h.id] = v;
    });

    try {
      if (editId) {
        // Düzenleme
        const { error } = await supabase.from('kullanicilar').update({
          adi: form.adi,
          telefon: form.telefon,
          email: form.email,
          rol: form.rol,
          hizmet_ucretleri: hizmetUcretleriObj,
        }).eq('id', editId);
        if (error) throw error;
        setInfo('Eğitmen güncellendi');
        setOpen(false);
        getir();
      } else {
        // Yeni ekleme
        if (form.sifre.length < 6) {
          setHata('Şifre en az 6 karakter');
          return;
        }
        const { data, error } = await secondary.auth.signUp({
          email: form.email,
          password: form.sifre,
          options: { data: { adi: form.adi, telefon: form.telefon, rol: form.rol } },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            const { data: signIn } = await secondary.auth.signInWithPassword({
              email: form.email,
              password: form.sifre,
            });
            if (signIn?.user) {
              await supabase.from('kullanicilar').upsert([{
                id: signIn.user.id,
                adi: form.adi,
                telefon: form.telefon,
                email: form.email,
                rol: form.rol,
                sifre_hash: 'supabase_auth',
                hizmet_ucretleri: hizmetUcretleriObj,
              }], { onConflict: 'email' });
              setInfo('Email zaten vardı, eşleştirildi');
              setOpen(false);
              getir();
              await secondary.auth.signOut();
              return;
            }
            throw new Error('Bu email zaten kayıtlı.');
          }
          throw error;
        }
        if (data.user) {
          await supabase.from('kullanicilar').upsert([{
            id: data.user.id,
            adi: form.adi,
            telefon: form.telefon,
            email: form.email,
            rol: form.rol,
            sifre_hash: 'supabase_auth',
            hizmet_ucretleri: hizmetUcretleriObj,
          }], { onConflict: 'email' });
        }
        setInfo('Eğitmen oluşturuldu');
        setOpen(false);
        setTimeout(getir, 800);
        await secondary.auth.signOut();
      }
    } catch (err) {
      setHata(err.message);
    }
  };

  const sil = async (id, adi) => {
    if (!confirm(`${adi} silinsin mi?`)) return;
    const { count } = await supabase
      .from('randevular')
      .select('*', { count: 'exact', head: true })
      .eq('egitmen_id', id);
    if (count > 0) {
      alert('Bu eğitmenin randevuları var, önce onları silin');
      return;
    }
    await supabase.from('kullanicilar').delete().eq('id', id);
    getir();
  };

  const wa = (tel) => {
    let c = tel.replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-[16px] font-extrabold text-slate-900">Eğitmenler</h2>
          <p className="text-[11px] font-bold text-slate-500">{list.length} eğitmen</p>
        </div>
        <button
          onClick={yeniEkle}
          className="w-9 h-9 bg-[#5b46f5] text-white rounded-full flex items-center justify-center"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center py-10 text-xs font-bold">Yükleniyor</div>
        ) : (
          list.map((e) => (
            <div key={e.id} className="bg-white p-3 rounded-xl border flex justify-between items-center">
              <div className="text-left flex-1 min-w-0">
                <div className="text-[13px] font-extrabold text-slate-900">{e.adi} - {e.rol}</div>
                <div className="text-[10px] font-bold text-slate-600 truncate">{e.telefon} • {e.email}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => duzenle(e)}
                  className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center"
                  title="Düzenle"
                >
                  <Edit className="w-4 h-4 text-indigo-600" />
                </button>
                <button
                  onClick={() => wa(e.telefon)}
                  className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                </button>
                <a
                  href={`tel:${e.telefon}`}
                  className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center"
                  title="Ara"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => sil(e.id, e.adi)}
                  className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center"
                  title="Sil"
                >
                  <Trash className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] font-extrabold text-slate-900">
                {editId ? 'Eğitmen Düzenle' : 'Yeni Eğitmen Ekle'}
              </h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {hata && <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs font-bold rounded">{hata}</div>}
            {info && <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded">{info}</div>}

            <form onSubmit={kaydet} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900">Ad Soyad</label>
                <input
                  required
                  placeholder="Ad Soyad"
                  value={form.adi}
                  onChange={(e) => setForm({ ...form, adi: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900">Telefon (numeric klavye)</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0532 000 00 00"
                  value={form.telefon}
                  onChange={(e) => setForm({ ...form, telefon: e.target.value.replace(/\D/g, '') })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900">E-posta</label>
                <input
                  required
                  type="email"
                  placeholder="ornek@studio.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
                />
              </div>

              {!editId && (
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Şifre (en az 6, numeric klavye)</label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="123456"
                    value={form.sifre}
                    onChange={(e) => setForm({ ...form, sifre: e.target.value.replace(/\D/g, '') })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
                  />
                </div>
              )}

              {editId && (
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Yeni Şifre (opsiyonel, numeric klavye)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Boş = değişmez"
                    value={form.sifre}
                    onChange={(e) => setForm({ ...form, sifre: e.target.value.replace(/\D/g, '') })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-extrabold text-slate-900">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold text-sm"
                >
                  <option>Eğitmen</option>
                  <option>Admin</option>
                </select>
              </div>

              {hizmetler.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3">
                  <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Hizmet Bazlı Seans Ücretleri (TL)
                  </div>
                  <div className="space-y-2">
                    {hizmetler.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-sm gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-700 font-bold truncate">{h.adi}</div>
                          <div className="text-[9px] text-slate-500 font-bold">
                            {h.tur || 'Bireysel'} {h.katilim_sayisi > 1 ? `• ${h.katilim_sayisi} kişi` : ''} • {h.sure} dk
                          </div>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={ucretler[h.id] || ''}
                          onChange={(e) => setUcretler({ ...ucretler, [h.id]: e.target.value.replace(/\D/g, '') })}
                          className="w-24 px-2 py-1.5 border rounded-lg bg-slate-50 font-bold text-right text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Her hizmet için eğitmenin alacağı ücret (seans başı)
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold"
              >
                {editId ? 'Güncelle' : 'Oluştur ve Giriş Yetkisi Ver'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}