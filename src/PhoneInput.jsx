import React, { useEffect, useMemo, useRef, useState } from 'react';

const ULKELER = [
  { iso: 'TR', ad: 'Türkiye', dial: '90', flag: '🇹🇷' },
  { iso: 'DE', ad: 'Almanya', dial: '49', flag: '🇩🇪' },
  { iso: 'AT', ad: 'Avusturya', dial: '43', flag: '🇦🇹' },
  { iso: 'NL', ad: 'Hollanda', dial: '31', flag: '🇳🇱' },
  { iso: 'BE', ad: 'Belçika', dial: '32', flag: '🇧🇪' },
  { iso: 'FR', ad: 'Fransa', dial: '33', flag: '🇫🇷' },
  { iso: 'GB', ad: 'İngiltere', dial: '44', flag: '🇬🇧' },
  { iso: 'US', ad: 'ABD', dial: '1', flag: '🇺🇸' },
  { iso: 'AZ', ad: 'Azerbaycan', dial: '994', flag: '🇦🇿' },
  { iso: 'GE', ad: 'Gürcistan', dial: '995', flag: '🇬🇪' },
  { iso: 'BG', ad: 'Bulgaristan', dial: '359', flag: '🇧🇬' },
  { iso: 'GR', ad: 'Yunanistan', dial: '30', flag: '🇬🇷' },
  { iso: 'RU', ad: 'Rusya', dial: '7', flag: '🇷🇺' },
  { iso: 'UA', ad: 'Ukrayna', dial: '380', flag: '🇺🇦' },
  { iso: 'SY', ad: 'Suriye', dial: '963', flag: '🇸🇾' },
  { iso: 'IQ', ad: 'Irak', dial: '964', flag: '🇮🇶' },
  { iso: 'IR', ad: 'İran', dial: '98', flag: '🇮🇷' },
  { iso: 'SA', ad: 'Suudi Arabistan', dial: '966', flag: '🇸🇦' },
  { iso: 'AE', ad: 'BAE', dial: '971', flag: '🇦🇪' },
  { iso: 'QA', ad: 'Katar', dial: '974', flag: '🇶🇦' },
  { iso: 'KW', ad: 'Kuveyt', dial: '965', flag: '🇰🇼' },
  { iso: 'CY', ad: 'Kıbrıs', dial: '357', flag: '🇨🇾' },
  { iso: 'SE', ad: 'İsveç', dial: '46', flag: '🇸🇪' },
  { iso: 'CH', ad: 'İsviçre', dial: '41', flag: '🇨🇭' },
  { iso: 'IT', ad: 'İtalya', dial: '39', flag: '🇮🇹' },
  { iso: 'ES', ad: 'İspanya', dial: '34', flag: '🇪🇸' },
  { iso: 'RO', ad: 'Romanya', dial: '40', flag: '🇷🇴' },
];

export function telNorm(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '90' + d.slice(1);
  return d.slice(0, 15);
}

export function telKaydet(raw) {
  const n = telNorm(raw);
  return n ? '+' + n : '';
}

export function telGecerli(raw) {
  const n = telNorm(raw);
  if (!n) return false;
  if (n.startsWith('90')) return n.length === 12;
  return n.length >= 8 && n.length <= 15;
}

function parseValue(value) {
  const n = telNorm(value);
  if (!n) return { dial: '90', national: '' };
  const sorted = [...ULKELER].sort((a, b) => b.dial.length - a.dial.length);
  const hit = sorted.find((u) => n.startsWith(u.dial));
  if (hit) return { dial: hit.dial, national: n.slice(hit.dial.length) };
  return { dial: '90', national: n };
}

function formatNational(dial, digits) {
  const d = (digits || '').replace(/\D/g, '');
  if (dial === '90') {
    const x = d.slice(0, 10);
    const p = [];
    if (x.length) p.push(x.slice(0, 3));
    if (x.length > 3) p.push(x.slice(3, 6));
    if (x.length > 6) p.push(x.slice(6, 8));
    if (x.length > 8) p.push(x.slice(8, 10));
    return p.join(' ');
  }
  return d;
}

export default function PhoneInput({ value, onChange, required }) {
  const parsed = parseValue(value);
  const [acik, setAcik] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef(null);
  const ulke = ULKELER.find((u) => u.dial === parsed.dial) || ULKELER[0];

  useEffect(() => {
    const fn = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setAcik(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const liste = useMemo(() => {
    const s = q.trim();
    if (!s) return ULKELER;
    return ULKELER.filter((u) => u.dial.startsWith(s) || u.ad.toLocaleLowerCase('tr-TR').includes(s.toLocaleLowerCase('tr-TR')));
  }, [q]);

  const ulkeSec = (u) => {
    setAcik(false);
    setQ('');
    onChange(telKaydet(u.dial + parsed.national));
  };

  const setNational = (raw) => {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('0')) d = d.slice(1);
    d = d.slice(0, parsed.dial === '90' ? 10 : 15 - parsed.dial.length);
    onChange(telKaydet(parsed.dial + d));
  };

  return (
    <div ref={wrap} className="flex gap-2">
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setAcik(!acik)}
          className="h-full px-2.5 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm flex items-center gap-1"
        >
          <span>{ulke.flag}</span>
          <span>+{ulke.dial}</span>
        </button>
        {acik && (
          <div className="absolute z-20 mt-1 w-52 bg-white border rounded-xl shadow-lg overflow-hidden">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="90 veya ülke"
              className="w-full px-2 py-2 border-b text-xs font-bold"
            />
            <div className="overflow-y-auto max-h-44">
              {liste.length === 0 ? (
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400">Yok</div>
              ) : (
                liste.map((u) => (
                  <button
                    type="button"
                    key={u.iso}
                    onClick={() => ulkeSec(u)}
                    className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 flex gap-2 items-center"
                  >
                    <span>{u.flag}</span>
                    <span>+{u.dial}</span>
                    <span className="text-slate-500 truncate">{u.ad}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      <input
        required={required}
        type="tel"
        inputMode="numeric"
        placeholder={parsed.dial === '90' ? '5xx xxx xx xx' : 'Numara'}
        value={formatNational(parsed.dial, parsed.national)}
        onChange={(e) => setNational(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm"
      />
    </div>
  );
}