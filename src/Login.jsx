import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import { Lock, Mail, Dumbbell } from './Icons.jsx';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-full bg-[#5b46f5] text-white items-center justify-center mb-4">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold">Studio G</h2>
        <p className="text-sm font-bold text-slate-500">Eğitmen ve Yönetici Portalı</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border">
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