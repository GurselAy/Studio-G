import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import { Lock, Mail } from './Icons.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setErrorMsg('E-posta adresiniz henüz onaylanmamış. Yönetici ile iletişime geçin.');
      } else {
        setErrorMsg('Giriş başarısız: ' + error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f59a00] flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="relative w-40 h-24 mx-auto flex items-center justify-center select-none -translate-y-[2cm]">
        <span
          className="absolute text-[112px] leading-none text-black"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          G
        </span>
        <span
          className="relative z-10 text-[24px] tracking-[0.18em] text-black whitespace-nowrap bg-[#f59a00] px-1 leading-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          STUDIO'G
        </span>
      </div>
      <p className="text-center text-sm font-bold text-black/70 mb-8">Eğitmen ve Yönetici Portalı</p>
      <div className="bg-[#f59a00] p-6 rounded-2xl border">
        <form onSubmit={handleLogin} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border">{errorMsg}</div>
          )}
          <div>
            <label className="text-xs font-extrabold">E-Posta</label>
            <div className="relative mt-1">
              <Mail className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-extrabold">Şifre</label>
            <div className="relative mt-1">
              <Lock className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5b46f5] text-white font-extrabold rounded-xl disabled:opacity-50"
          >
            {loading ? 'Giriş...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}