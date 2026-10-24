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
    <div className="min-h-[100dvh] bg-[#f59a00] flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-md mx-auto md:max-w-sm">
        <div className="relative w-40 h-24 mx-auto flex items-center justify-center select-none -translate-y-[2cm] md:-translate-y-6">
          <span
            className="absolute text-[112px] md:text-[104px] leading-none text-black"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            G
          </span>
          <span
            className="relative z-10 text-[24px] md:text-[22px] tracking-[0.18em] text-black whitespace-nowrap bg-[#f59a00] px-1 leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            STUDIO'G
          </span>
        </div>
        <p className="text-center text-sm md:text-[15px] font-bold text-black/70 mb-8">Eğitmen ve Yönetici Portalı</p>
        <div className="bg-[#f59a00] p-6 md:p-7 rounded-2xl border md:shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-xs md:text-[13px] font-bold rounded-xl border">{errorMsg}</div>
            )}
            <div>
              <label className="text-xs md:text-[13px] font-extrabold">E-Posta</label>
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
              <label className="text-xs md:text-[13px] font-extrabold">Şifre</label>
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
              className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white font-extrabold rounded-xl disabled:opacity-50 transition"
            >
              {loading ? 'Giriş...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
