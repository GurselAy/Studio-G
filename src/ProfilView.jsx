import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import PhoneInput, { telKaydet, telGecerli } from './PhoneInput.jsx';

export default function ProfilView({ embedded, paket, musteri, onClose, onSuccess }) {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ adi: '', telefon: '', email: '' });
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data } = await supabase
      .from('kullanicilar')
      .select('*')
      .eq('id', u.id)
      .maybeSingle();
    if (data) {
      setUser(data);
      setForm({
        adi: data.adi || '',
        telefon: data.telefon || '',
        email: data.email || u.email || '',
      });
    }
  };

  const saveAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setHata('');
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error('Kullanıcı bulunamadı');

      const tel = telKaydet(form.telefon);
      if (!telGecerli(tel)) throw new Error('Telefon 10 hane olmalı (5xx xxx xx xx).');

      const { error: pErr } = await supabase
        .from('kullanicilar')
        .update({ adi: form.adi, telefon: tel })
        .eq('id', u.id);
      if (pErr) throw pErr;

      if (form.email && form.email !== user?.email && form.email !== u.email) {
        const { error: eErr } = await supabase.auth.updateUser({ email: form.email });
        if (eErr) throw eErr;
      }

      if (newPass && newPass.length >= 6) {
        const { error: sErr } = await supabase.auth.updateUser({ password: newPass });
        if (sErr) throw sErr;
        setNewPass('');
      } else if (newPass && newPass.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalı');
      }

      await getProfile();
      setMsg('Profil güncellendi');
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-10 text-center text-xs font-bold text-slate-400">Yükleniyor...</div>
    );
  }

  const content = (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
          ✓ {msg}
        </div>
      )}
      {hata && (
        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200">
          ✗ {hata}
        </div>
      )}
      <form onSubmit={saveAll} className="space-y-3">
        <div>
          <label className="text-xs font-extrabold text-slate-900">Ad Soyad</label>
          <input
            value={form.adi}
            onChange={(e) => setForm({ ...form, adi: e.target.value })}
            className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-extrabold text-slate-900">Telefon</label>
          <div className="mt-1">
            <PhoneInput required value={form.telefon} onChange={(v) => setForm({ ...form, telefon: v })} />
          </div>
        </div>
        <div>
          <label className="text-xs font-extrabold text-slate-900">E-posta</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Değiştirirsen yeni e-posta ile giriş yapman gerekir
          </p>
        </div>
        <div>
          <label className="text-xs font-extrabold text-slate-900">Yeni Şifre (numeric, boş bırakırsan değişmez)</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Boş = değişmez (en az 6 hane)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value.replace(/\D/g, ''))}
            className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold disabled:opacity-50"
        >
          {loading ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return (
      <>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Profili Düzenle</h2>
          <p className="text-sm text-slate-500">Tüm bilgileri tek yerden güncelleyin.</p>
        </div>
        <div className="p-6">{content}</div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[18px] font-extrabold">Profilim</h2>
        {onClose && (
          <button onClick={onClose} className="text-xs font-bold text-slate-500">
            Kapat
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl border p-4">{content}</div>
    </div>
  );
}