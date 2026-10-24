import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { Plus, Trash, Edit, X, Phone, MessageSquare } from './Icons.jsx';
import PhoneInput, { telNorm, telKaydet, telGecerli } from './PhoneInput.jsx';

function ilkHarfBuyuk(s) {
  const t = s || '';
  if (!t) return t;
  const first = t.charAt(0);
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(first)) return t;
  return first.toLocaleUpperCase('tr-TR') + t.slice(1);
}

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

  const duzenle = async (egitmen) => {
    setEditId(egitmen.id);
    setForm({ adi: egitmen.adi, telefon: egitmen.telefon || '', email: egitmen.email || '', sifre: '', rol: egitmen.rol });
    setHata('');
    setInfo('');

    const { data: mevcut } = await supabase
      .from('egitmen_hizmet_ucretleri')
      .select('hizmet_id, ucret')
      .eq('egitmen_id', egitmen.id);

    const u = {};
    hizmetler.forEach((h) => {
      const v = mevcut?.find((m) => m.hizmet_id === h.id);
      u[h.id] = v ? String(v.ucret) : '0';
    });
    setUcretler(u);
    setOpen(true);
  };

  const kaydet = async (e) => {
    e.preventDefault();
    setHata('');
    setInfo('');

    try {
      const adi = ilkHarfBuyuk(form.adi).trim();
      const tel = telKaydet(form.telefon);
      if (!telGecerli(tel)) {
        setHata('Telefon 10 hane olmalı (5xx xxx xx xx).');
        return;
      }
      const { data: adaylar } = await supabase.from('kullanicilar').select('id, adi, telefon');
      const adiK = adi.toLocaleLowerCase('tr-TR');
      const n = telNorm(tel);
      const varOlan = (adaylar || []).some((k) => {
        if (editId && k.id === editId) return false;
        const ayniAd = (k.adi || '').trim().toLocaleLowerCase('tr-TR') === adiK;
        const ayniTel = telNorm(k.telefon) === n;
        return ayniAd && ayniTel;
      });
      if (varOlan) {
        setHata('Bu eğitmen zaten kayıtlı.');
        return;
      }

      let targetEgitmenId = editId;

      if (editId) {
        const { error } = await supabase.from('kullanicilar').update({
          adi,
          telefon: tel,
          email: form.email,
          rol: form.rol,
        }).eq('id', editId);
        if (error) throw error;
      } else {
        if (form.sifre.length < 6) {
          setHata('Şifre en az 6 karakter');
          return;
        }
        const { data, error } = await secondary.auth.signUp({
          email: form.email,
          password: form.sifre,
          options: { data: { adi, telefon: tel, rol: form.rol } },
        });
        if (error) {
          if (error.message.includes('already registered')) {
            const { data: signIn } = await secondary.auth.signInWithPassword({
              email: form.email,
              password: form.sifre,
            });
            if (signIn?.user) {
              targetEgitmenId = signIn.user.id;
              await supabase.from('kullanicilar').upsert([{
                id: signIn.user.id,
                adi,
                telefon: tel,
                email: form.email,
                rol: form.rol,
                sifre_hash: 'supabase_auth',
              }], { onConflict: 'email' });
            } else {
              throw new Error('Bu email zaten kayıtlı.');
            }
          } else {
            throw error;
          }
        } else if (data.user) {
          targetEgitmenId = data.user.id;
          await supabase.from('kullanicilar').upsert([{
            id: data.user.id,
            adi,
            telefon: tel,
            email: form.email,
            rol: form.rol,
            sifre_hash: 'supabase_auth',
          }], { onConflict: 'email' });
        }
      }

      const ucretRows = hizmetler
        .map((h) => {
          const v = parseFloat(ucretler[h.id]);
          return {
            egitmen_id: targetEgitmenId,
            hizmet_id: h.id,
            ucret: isNaN(v) ? 0 : v,
          };
        })
        .filter((r) => r.ucret > 0);

      await supabase.from('egitmen_hizmet_ucretleri').delete().eq('egitmen_id', targetEgitmenId);

      if (ucretRows.length > 0) {
        const { error: ucretErr } = await supabase.from('egitmen_hizmet_ucretleri').insert(ucretRows);
        if (ucretErr) throw ucretErr;
      }

      setInfo(editId ? 'Eğitmen güncellendi' : 'Eğitmen oluşturuldu');
      setOpen(false);
      setTimeout(getir, 500);

      if (!editId) {
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
    let c = (tel || '').replace(/\D/g, '');
    if (!c) return;
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 md:px-5 md:py-4 border-b flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[16px] md:text-[18px] font-extrabold text-slate-900">Eğitmenler</h2>
          <p className="text-[11px] md:text-[12px] font-bold text-slate-500">{list.length} eğitmen</p>
        </div>
        <button
          onClick={yeniEkle}
          className="w-9 h-9 md:w-auto md:h-auto md:px-4 md:py-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-full md:rounded-xl flex items-center justify-center gap-1.5 transition"
        >
          <Plus className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline text-[12px] font-extrabold">Yeni Eğitmen</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:auto-rows-min md:content-start">
        {loading ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold md:col-span-full">Yükleniyor</div>
        ) : (
          list.map((e) => (
            <div key={e.id} className="bg-white p-3 md:p-4 rounded-xl border flex justify-between items-center md:hover:shadow-md md:hover:border-indigo-200 transition">
              <div className="text-left flex-1 min-w-0">
                <div className="text-[13px] md:text-[14px] font-extrabold text-slate-900 truncate">{e.adi} - {e.rol}</div>
                <div className="text-[10px] md:text-[11px] font-bold text-slate-600 truncate">{e.telefon} • {e.email}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => duzenle(e)}
                  className="w-8 h-8 md:w-9 md:h-9 bg-indigo-50 rounded-full flex items-center justify-center md:hover:bg-indigo-100 transition"
                  title="Düzenle"
                >
                  <Edit className="w-4 h-4 text-indigo-600" />
                </button>
                <button
                  onClick={() => wa(e.telefon)}
                  className="w-7 h-7 md:w-8 md:h-8 bg-emerald-50 rounded-full flex items-center justify-center md:hover:bg-emerald-100 transition"
                  title="WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                </button>
                <a
                  href={`tel:${e.telefon}`}
                  className="w-7 h-7 md:w-8 md:h-8 bg-indigo-50 rounded-full flex items-center justify-center md:hover:bg-indigo-100 transition"
                  title="Ara"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => sil(e.id, e.adi)}
                  className="w-7 h-7 md:w-8 md:h-8 bg-red-50 rounded-full flex items-center justify-center md:hover:bg-red-100 transition"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white w-full max-w-sm md:max-w-2xl rounded-2xl p-5 md:p-6 max-h-[90dvh] md:max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold text-slate-900">
                {editId ? 'Eğitmen Düzenle' : 'Yeni Eğitmen Ekle'}
              </h2>
              <button onClick={() => setOpen(false)} className="md:hover:bg-slate-100 md:rounded-full md:p-1 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {hata && <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs md:text-[13px] font-bold rounded">{hata}</div>}
            {info && <div className="mt-2 p-2 bg-emerald-50 text-emerald-700 text-xs md:text-[13px] font-bold rounded">{info}</div>}

            <form onSubmit={kaydet} className="mt-3 space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Ad Soyad</label>
                <input
                  required
                  placeholder="Ad Soyad"
                  value={form.adi}
                  onChange={(e) => setForm({ ...form, adi: ilkHarfBuyuk(e.target.value) })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm md:text-[14px]"
                />
              </div>

              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Telefon</label>
                <div className="mt-1">
                  <PhoneInput required value={form.telefon} onChange={(v) => setForm({ ...form, telefon: v })} />
                </div>
              </div>

              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">E-posta</label>
                <input
                  required
                  type="email"
                  placeholder="ornek@studio.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm md:text-[14px]"
                />
              </div>

              {!editId && (
                <div>
                  <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Şifre (en az 6, numeric klavye)</label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="123456"
                    value={form.sifre}
                    onChange={(e) => setForm({ ...form, sifre: e.target.value.replace(/\D/g, '') })}
                    className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm md:text-[14px]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs md:text-[13px] font-extrabold text-slate-900">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold text-sm md:text-[14px] md:hover:border-slate-300 transition"
                >
                  <option>Eğitmen</option>
                  <option>Admin</option>
                </select>
              </div>

              {hizmetler.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 md:col-span-2">
                  <div className="text-xs md:text-[13px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Hizmet Bazlı Seans Ücretleri (TL)
                  </div>
                  <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-2">
                    {hizmetler.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-sm gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-700 font-bold truncate">{h.adi}</div>
                          <div className="text-[9px] md:text-[10px] text-slate-500 font-bold">
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
                          className="w-24 md:w-28 px-2 py-1.5 border rounded-lg bg-slate-50 font-bold text-right text-sm md:text-[14px]"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] md:text-[11px] text-slate-500 mt-2">
                    Her hizmet için eğitmenin alacağı ücret (seans başı)
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl font-extrabold text-sm md:text-[14px] transition md:col-span-2"
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
