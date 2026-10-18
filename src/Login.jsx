import React, { useState } from 'react';
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@studiog.com');
  const [sifre, setSifre] = useState('123456');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const handle = async (e) => {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    const ok = await onLogin(email, sifre);
    if (!ok) setHata('E-posta veya şifre hatalı. (Demo: 123456)');
    setYukleniyor(false);
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-500 via-indigo-600 to-purple-700 p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/10 text-white">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600/20 mb-4">
          <svg className="h-8 w-8 text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={2} y={4} width={20} height={16} rx={2} />
            <path d="M10 4v4" />
            <path d="M2 8h20" />
            <path d="M6 4v4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Studio G</h2>
        <p className="text-violet-200 text-sm mb-8">Salon Yönetim Sistemi</p>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-violet-200 mb-1">E-posta</label>
            <input
              type="email"
              className="w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-violet-400 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-violet-200 mb-1">Şifre</label>
            <input
              type="password"
              className="w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-violet-400 outline-none"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
            />
          </div>
          {hata && (
            <div className="rounded-lg bg-red-900/30 border border-red-500/50 px-4 py-3 text-sm text-red-200">
              {hata}
            </div>
          )}
          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold bg-white text-violet-700 shadow active:scale-95 transition disabled:opacity-50"
          >
            {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
          <p className="text-center text-xs text-violet-200/80">
            Demo: admin@studiog.com veya egitmen@studiog.com (şifre: 123456)
          </p>
        </form>
      </div>
    </div>
  );
}