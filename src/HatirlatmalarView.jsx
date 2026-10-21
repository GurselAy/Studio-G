import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { Phone, MessageSquare } from './Icons.jsx';

const dayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dayStr(d);
};
const saatYazi = (t) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

const SABLON_KEY = 'sg_hatirlatma_sablon';
const VARSAYILAN_SABLON = 'Merhaba {ad}, {gun} saat {saat} {hizmet} dersiniz var. Görüşmek üzere! — Studio G';

const waAc = (tel, mesaj) => {
  let c = (tel || '').replace(/\D/g, '');
  if (!c) return;
  if (c.startsWith('0')) c = c.slice(1);
  if (!c.startsWith('90')) c = '90' + c;
  window.open(`https://wa.me/${c}?text=${encodeURIComponent(mesaj)}`, '_blank', 'noopener,noreferrer');
};

export default function HatirlatmalarView() {
  const [tab, setTab] = useState('ders');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);

  // Ders hatırlatma
  const [gunOffset, setGunOffset] = useState(2); // sizin akış: 2 gün önceden hatırlatma
  const [seanslar, setSeanslar] = useState([]);
  const [sablon, setSablon] = useState(() => localStorage.getItem(SABLON_KEY) || VARSAYILAN_SABLON);
  const [sYukleniyor, setSYukleniyor] = useState(true);

  // Paket uyarıları
  const [sinir, setSinir] = useState(2);
  const [paketler, setPaketler] = useState([]);
  const [pYukleniyor, setPYukleniyor] = useState(true);
  const [gelmeyenGun, setGelmeyenGun] = useState(15);
  const [gelmeyenler, setGelmeyenler] = useState([]);
  const [gYukleniyor, setGYukleniyor] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from('kullanicilar').select('rol').eq('id', user.id).single();
      setIsAdmin(data?.rol === 'Admin');
    })();
  }, []);

  // ---- Ders hatırlatma listesi ----
  useEffect(() => {
    if (!userId) return;
    let iptal = false;
    (async () => {
      setSYukleniyor(true);
      const tarih = addDays(dayStr(new Date()), gunOffset);
      const start = new Date(`${tarih}T00:00:00+03:00`).toISOString();
      const end = new Date(`${addDays(tarih, 1)}T00:00:00+03:00`).toISOString();
      let q = supabase
        .from('randevular')
        .select('id, musteri_id, baslangic_saati, musteriler(adi, telefon), hizmetler(adi), kullanicilar(adi)')
        .eq('durum', 'planlandı')
        .gte('baslangic_saati', start)
        .lt('baslangic_saati', end)
        .order('baslangic_saati');
      if (!isAdmin) q = q.eq('egitmen_id', userId);
      const { data: list } = await q;
      if (!iptal) { setSeanslar(list || []); setSYukleniyor(false); }
    })();
    return () => { iptal = true; };
  }, [gunOffset, isAdmin, userId]);

  // ---- Paketi bitmek üzere olanlar ----
  useEffect(() => {
    let iptal = false;
    (async () => {
      setPYukleniyor(true);
      const { data } = await supabase
        .from('musteri_paketleri')
        .select('id, kalan_seans, toplam_seans, musteriler(adi, telefon), hizmetler(adi)')
        .eq('durum', true)
        .lte('kalan_seans', sinir)
        .order('kalan_seans');
      if (!iptal) { setPaketler(data || []); setPYukleniyor(false); }
    })();
    return () => { iptal = true; };
  }, [sinir]);

  // ---- Uzun süredir gelmeyenler ----
  useEffect(() => {
    let iptal = false;
    (async () => {
      setGYukleniyor(true);
      const [{ data: ms }, { data: rs }] = await Promise.all([
        supabase.from('musteriler').select('id, adi, telefon').order('adi'),
        supabase
          .from('randevular')
          .select('musteri_id, baslangic_saati, durum')
          .lt('baslangic_saati', new Date().toISOString())
          .neq('durum', 'iptal edildi')
          .order('baslangic_saati', { ascending: false }),
      ]);
      const son = {};
      (rs || []).forEach((r) => { if (!son[r.musteri_id]) son[r.musteri_id] = r.baslangic_saati; });
      const sinirZaman = Date.now() - gelmeyenGun * 86400000;
      const liste = (ms || [])
        .filter((m) => { const s = son[m.id]; return !s || new Date(s).getTime() < sinirZaman; })
        .map((m) => ({ ...m, son: son[m.id] || null }));
      if (!iptal) { setGelmeyenler(liste); setGYukleniyor(false); }
    })();
    return () => { iptal = true; };
  }, [gelmeyenGun]);

  const mesajDoldur = (s) => {
    const d = new Date(`${addDays(dayStr(new Date()), gunOffset)}T12:00:00`);
    const gunYazi = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    return sablon
      .replaceAll('{ad}', s.musteriler?.adi || '')
      .replaceAll('{gun}', gunYazi)
      .replaceAll('{saat}', saatYazi(s.baslangic_saati))
      .replaceAll('{hizmet}', s.hizmetler?.adi || '')
      .replaceAll('{egitmen}', s.kullanicilar?.adi || '');
  };

  const gunEtiket = ['Bugün', 'Yarın', '2 gün sonra', '3 gün sonra'];
  const gunTarih = addDays(dayStr(new Date()), gunOffset)
    .split('-').reverse().join('.');

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 border-b">
        <h1 className="text-[16px] font-extrabold text-slate-900">Hatırlatmalar</h1>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-3">
          <button onClick={() => setTab('ders')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${tab === 'ders' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Ders Hatırlatma</button>
          <button onClick={() => setTab('paket')} className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${tab === 'paket' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Paket Uyarıları</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === 'ders' && (
          <>
            <div className="flex gap-1.5">
              {gunEtiket.map((etiket, i) => (
                <button key={i} onClick={() => setGunOffset(i)} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${gunOffset === i ? 'bg-[#5b46f5] text-white' : 'bg-white border text-slate-600'}`}>{etiket}</button>
              ))}
            </div>

            <div className="bg-white border rounded-xl p-3">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase">Mesaj Şablonu</label>
              <textarea
                value={sablon}
                onChange={(e) => { setSablon(e.target.value); localStorage.setItem(SABLON_KEY, e.target.value); }}
                rows={2}
                className="w-full mt-1 px-2 py-2 bg-slate-50 border rounded-lg text-[11px] font-bold"
              />
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                Yer tutucular: {'{ad} {gun} {saat} {hizmet} {egitmen}'} — yazdığınız otomatik kaydedilir.
              </p>
            </div>

            {sYukleniyor ? (
              <p className="text-center py-8 text-xs font-bold text-slate-400">Yükleniyor...</p>
            ) : seanslar.length === 0 ? (
              <p className="text-center py-8 text-xs font-bold text-slate-400">{gunEtiket[gunOffset]} ({gunTarih}) için planlı ders yok</p>
            ) : (
              <div className="space-y-2">
                {seanslar.map((s) => (
                  <div key={s.id} className="bg-white border rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">{s.musteriler?.adi}</div>
                      <div className="text-[10px] font-bold text-slate-500">
                        {saatYazi(s.baslangic_saati)} • {s.hizmetler?.adi} • {s.kullanicilar?.adi?.split(' ')[0]}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {s.musteriler?.telefon && (
                        <a href={`tel:${s.musteriler.telefon}`} className="w-8 h-8 bg-indigo-50 border rounded-full flex items-center justify-center">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => waAc(s.musteriler?.telefon, mesajDoldur(s))}
                        disabled={!s.musteriler?.telefon}
                        className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center disabled:opacity-40"
                        title="Hatırlatma gönder"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'paket' && (
          <>
            {/* Paketi bitmek üzere olanlar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-extrabold text-slate-900 uppercase">Paketi Bitmek Üzere</h3>
                <div className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <button key={n} onClick={() => setSinir(n)} className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${sinir === n ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'}`}>≤{n} seans</button>
                  ))}
                </div>
              </div>
              {pYukleniyor ? (
                <p className="text-center py-6 text-xs font-bold text-slate-400">Yükleniyor...</p>
              ) : paketler.length === 0 ? (
                <p className="text-center py-6 text-xs font-bold text-slate-400">Bu kriterde paket yok 👍</p>
              ) : (
                <div className="space-y-2">
                  {paketler.map((p) => (
                    <div key={p.id} className="bg-white border border-amber-200 bg-amber-50/50 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">{p.musteriler?.adi}</div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {p.hizmetler?.adi} • <span className="text-amber-700">{p.kalan_seans}/{p.toplam_seans} seans kaldı</span>
                        </div>
                      </div>
                      <button
                        onClick={() => waAc(p.musteriler?.telefon, `Merhaba ${p.musteriler?.adi || ''}, ${p.hizmetler?.adi || ''} paketinizde ${p.kalan_seans} seans kaldı. Yenilemek için bize ulaşabilirsiniz. — Studio G`)}
                        disabled={!p.musteriler?.telefon}
                        className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uzun süredir gelmeyenler */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-extrabold text-slate-900 uppercase">Uzun Süredir Gelmiyor</h3>
                <div className="flex gap-1">
                  {[10, 15, 30].map((n) => (
                    <button key={n} onClick={() => setGelmeyenGun(n)} className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${gelmeyenGun === n ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>{n} gün</button>
                  ))}
                </div>
              </div>
              {gYukleniyor ? (
                <p className="text-center py-6 text-xs font-bold text-slate-400">Yükleniyor...</p>
              ) : gelmeyenler.length === 0 ? (
                <p className="text-center py-6 text-xs font-bold text-slate-400">Herkes gelmiş, güzel 👍</p>
              ) : (
                <div className="space-y-2">
                  {gelmeyenler.map((m) => (
                    <div key={m.id} className="bg-white border rounded-xl p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">{m.adi}</div>
                        <div className="text-[10px] font-bold text-slate-500">
                          {m.son
                            ? <>Son: {new Date(m.son).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • <span className="text-rose-600">{Math.floor((Date.now() - new Date(m.son).getTime()) / 86400000)} gün önce</span></>
                            : <span className="text-slate-400">Hiç seans kaydı yok</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => waAc(m.telefon, `Merhaba ${m.adi}, sizi özledik! Yakın zamanda görüşelim mi? — Studio G`)}
                        disabled={!m.telefon}
                        className="w-8 h-8 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}