import React, { useRef, useMemo, useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useMasaustu } from './useMasaustu.js';

const isoGun = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TakvimView({
  secilenTarih,
  setSecilenTarih,
  egitmenler,
  userId,
  userRole,
  onRandevuClick,
}) {
  const masaustu = useMasaustu();
  const start = 8;
  const end = 22;
  const slot = 30;
  const row = masaustu ? 56 : 40;
  const rowHafta = 44;
  const slots = useMemo(() => {
    const arr = [];
    for (let m = start * 60; m <= end * 60; m += slot) {
      arr.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return arr;
  }, []);
  const total = slots.length * row;
  const totalHafta = slots.length * rowHafta;
  const colors = ['#2563eb', '#16a34a', '#c026d3', '#f97316', '#0891b2', '#7c3aed'];

  const [randevular, setRandevular] = useState([]);
  const [loading, setLoading] = useState(true);

  const bugunIso = isoGun(new Date());

  /* ---------- GÖRÜNÜM: 'iki' (Bugün + Yarın) | 'hafta' (seçili eğitmen) ----------
     Haftalık görünüm yalnızca PC'de; telefonda tek gün (görünüm aynı). */
  const [gorunum, setGorunum] = useState('iki');
  const haftaMi = masaustu && gorunum === 'hafta';

  /* ---- PC'de iki gün: seçili gün + ertesi gün (Bugün / Yarın) ---- */
  const ertesiGunIso = useMemo(() => {
    const d = new Date(secilenTarih + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return isoGun(d);
  }, [secilenTarih]);

  const sonrakiGunIso = useMemo(() => {
    const d = new Date(secilenTarih + 'T12:00:00');
    d.setDate(d.getDate() + 2);
    return isoGun(d);
  }, [secilenTarih]);

  const gunler = useMemo(
    () => (masaustu ? [secilenTarih, ertesiGunIso] : [secilenTarih]),
    [masaustu, secilenTarih, ertesiGunIso]
  );

  useEffect(() => {
    randevulariGetir();
    gecmisRandevulariTamamlandiYap();
  }, [secilenTarih]);

  // üstteki ile değiştirilebilir.
  /* useEffect(() => {
    randevulariGetir();
    // Geçmiş planlanmışları "tamamlandı" yapmak günde 1 kez yeterli.
    // Her açılışta 1 select + 1 update atmak açılışı yavaşlatıyordu.
    const bugun = new Date().toISOString().slice(0, 10);
    const anahtar = 'sg_gecmis_tamamlandi_' + bugun;
    if (!sessionStorage.getItem(anahtar)) {
      sessionStorage.setItem(anahtar, '1');
      gecmisRandevulariTamamlandiYap();
    }
  }, [secilenTarih]); */

  const gecmisRandevulariTamamlandiYap = async () => {
    const simdi = new Date().toISOString();
    const { data: gecmis } = await supabase
      .from('randevular')
      .select('id, durum')
      .eq('durum', 'planlandı')
      .lt('bitis_saati', simdi)
      .limit(50);
    if (gecmis && gecmis.length > 0) {
      const ids = gecmis.map((r) => r.id);
      await supabase.from('randevular').update({ durum: 'tamamlandı' }).in('id', ids);
    }
  };

  // HERKES tüm randevuları görür (eğitmen filtresi YOK)
  // PC'de iki günlük aralık çekilir, mobilde tek gün (aynı sorgu, aralık dar)
  const randevulariGetir = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('randevular')
      .select('id, hizmet_id, egitmen_id, seri_id, baslangic_saati, bitis_saati, durum, hizmetler(adi, tur, katilim_sayisi), randevu_katilimcilari(musteri_id, paket_id, musteriler(adi, telefon))')
      .eq('durum', 'planlandı')
      .gte('baslangic_saati', secilenTarih + 'T00:00:00')
      .lt('baslangic_saati', (masaustu ? sonrakiGunIso : ertesiGunIso) + 'T00:00:00')
      .order('baslangic_saati');

    if (data) setRandevular(data);
    setLoading(false);
  };

  const toMins = (iso) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const touch = useRef({ x: 0, y: 0 });
  const onStart = (e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return;
    const d = new Date(secilenTarih + 'T12:00:00');
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    setSecilenTarih(d.toISOString().slice(0, 10));
  };

  /* ---- Gün → eğitmen → randevular (iki gün için ayrı ayrı) ---- */
  const groupedGun = useMemo(() => {
    const out = {};
    gunler.forEach((g) => {
      out[g] = {};
      (egitmenler || []).forEach((e) => (out[g][e.id] = []));
    });
    (randevular || []).forEach((r) => {
      const k = isoGun(new Date(r.baslangic_saati));
      if (!out[k]) return;
      if (!out[k][r.egitmen_id]) out[k][r.egitmen_id] = [];
      out[k][r.egitmen_id].push(r);
    });
    return out;
  }, [gunler, egitmenler, randevular]);

  /* ---- Gün etiketi: Bugün / Yarın / "Cum 24 Eki" ---- */
  const gunEtiket = (iso) => {
    if (iso === bugunIso) return 'Bugün';
    const d = new Date(iso + 'T12:00:00');
    const yarin = new Date();
    yarin.setDate(yarin.getDate() + 1);
    if (iso === isoGun(yarin)) return 'Yarın';
    return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const gunAltEtiket = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  /* =====================================================================
     HAFTALIK GÖRÜNÜM — seçili eğitmen × haftanın 7 günü
     Üstte eğitmen listesi, solda saat, yanında Pazartesi→Pazar.
     ===================================================================== */
  const [haftaRandevular, setHaftaRandevular] = useState([]);
  const [haftaYukleniyor, setHaftaYukleniyor] = useState(false);
  const [haftaEgitmen, setHaftaEgitmen] = useState(null);

  // İlk eğitmeni otomatik seç
  useEffect(() => {
    if (!haftaEgitmen && egitmenler && egitmenler.length > 0) setHaftaEgitmen(egitmenler[0].id);
  }, [egitmenler]);

  // Haftanın 7 günü (Pazartesi → Pazar), secilenTarih'in haftası
  const haftaGunleri = useMemo(() => {
    const base = new Date(secilenTarih + 'T12:00:00');
    const diff = base.getDay() === 0 ? -6 : 1 - base.getDay();
    const pazartesi = new Date(base);
    pazartesi.setDate(base.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(pazartesi);
      d.setDate(pazartesi.getDate() + i);
      return d;
    });
  }, [secilenTarih]);

  const haftaAraligi = `${haftaGunleri[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${haftaGunleri[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  useEffect(() => {
    if (!haftaMi) return;
    haftaGetir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haftaMi, secilenTarih]);

  // Hafta sorgusu: gün görünümüyle aynı kural → yalnızca 'planlandı'
  const haftaGetir = async () => {
    setHaftaYukleniyor(true);
    const ilk = haftaGunleri[0];
    const son = new Date(haftaGunleri[6]);
    son.setDate(son.getDate() + 1);
    const { data } = await supabase
      .from('randevular')
      .select('id, hizmet_id, egitmen_id, seri_id, baslangic_saati, bitis_saati, durum, hizmetler(adi, tur, katilim_sayisi), randevu_katilimcilari(musteri_id, paket_id, musteriler(adi))')
      .eq('durum', 'planlandı')
      .gte('baslangic_saati', isoGun(ilk) + 'T00:00:00')
      .lt('baslangic_saati', isoGun(son) + 'T00:00:00')
      .order('baslangic_saati');
    setHaftaRandevular(data || []);
    setHaftaYukleniyor(false);
  };

  /* Takvimde (gün + haftalık) yalnızca 'planlandı' randevular görünür.
     Rol farkı YOK — yönetici de eğitmen de aynı listeyi görür.
     (Sorgu .eq('durum', 'planlandı') ile zaten süzülüyor.) */
  const seciliEgitmen = (egitmenler || []).find((e) => e.id === haftaEgitmen);
  const haftaBosMu =
    !haftaYukleniyor && haftaRandevular.filter((r) => r.egitmen_id === haftaEgitmen).length === 0;

  const haftaKaydir = (n) => {
    const d = new Date(secilenTarih + 'T12:00:00');
    d.setDate(d.getDate() + n * 7);
    setSecilenTarih(isoGun(d));
  };

  // Seçili eğitmenin haftalık randevuları: gün → liste
  const haftaGunMap = useMemo(() => {
    const m = {};
    haftaGunleri.forEach((d) => (m[isoGun(d)] = []));
    haftaRandevular.forEach((r) => {
      if (r.egitmen_id !== haftaEgitmen) return;
      const k = isoGun(new Date(r.baslangic_saati));
      if (m[k]) m[k].push(r);
    });
    return m;
  }, [haftaGunleri, haftaRandevular, haftaEgitmen]);

  /* Aynı saatte iki randevu olursa ÜST ÜSTE BİNMESİN:
     her gün için "şerit" (lane) hesabı → kartlar yan yana daralır. */
  const haftaYerlesim = useMemo(() => {
    const out = {};
    Object.entries(haftaGunMap).forEach(([iso, liste]) => {
      const items = liste
        .map((f) => ({ f, s: toMins(f.baslangic_saati), e: toMins(f.bitis_saati) }))
        .sort((a, b) => a.s - b.s || a.e - b.e);
      const aktif = [];
      const yerlesen = [];
      items.forEach((it) => {
        const dolu = new Set();
        aktif.forEach((a) => {
          if (a.end > it.s) dolu.add(a.lane);
        });
        let lane = 0;
        while (dolu.has(lane)) lane++;
        aktif.push({ end: it.e, lane });
        for (let i = aktif.length - 1; i >= 0; i--) if (aktif[i].end <= it.s) aktif.splice(i, 1);
        yerlesen.push({ ...it, lane });
      });
      const serit = yerlesen.reduce((mx, x) => Math.max(mx, x.lane + 1), 1);
      out[iso] = yerlesen.map((x) => ({ ...x, serit }));
    });
    return out;
  }, [haftaGunMap]);

  const ustBar = masaustu ? (
    <div className="flex items-center gap-3 px-3 py-2 bg-white border-b shrink-0">
      <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
        <button
          onClick={() => setGorunum('iki')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-extrabold transition ${
            gorunum === 'iki' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Bugün + Yarın
        </button>
        <button
          onClick={() => setGorunum('hafta')}
          className={`px-3 py-1.5 rounded-md text-[12px] font-extrabold transition ${
            gorunum === 'hafta' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Haftalık
        </button>
      </div>

      {haftaMi && (
        <>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => haftaKaydir(-1)}
              className="w-7 h-7 border rounded-full flex items-center justify-center hover:bg-slate-50 text-[13px] font-bold"
            >
              ‹
            </button>
            <button
              onClick={() => haftaKaydir(1)}
              className="w-7 h-7 border rounded-full flex items-center justify-center hover:bg-slate-50 text-[13px] font-bold"
            >
              ›
            </button>
            <button
              onClick={() => setSecilenTarih(bugunIso)}
              className="ml-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-extrabold hover:bg-indigo-100 transition"
            >
              Bu Hafta
            </button>
          </div>
          <span className="text-[12px] font-extrabold text-slate-700 shrink-0">{haftaAraligi}</span>

          {/* Eğitmen listesi (üstte) — haftalık görünüm seçili eğitmeni gösterir */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar ml-auto pl-2">
            {(egitmenler || []).map((e, i) => {
              const secili = haftaEgitmen === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => setHaftaEgitmen(e.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition ${
                    secili ? 'text-white shadow' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  style={secili ? { backgroundColor: colors[i % colors.length] } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: secili ? '#fff' : colors[i % colors.length] }}
                  />
                  {e.adi}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  ) : null;

  /* ---------------------- HAFTALIK IZGARA (7 gün) ---------------------- */
  const haftaGorunum = (
    <div className="flex flex-col h-full bg-[#fffef5] overflow-hidden">
      {ustBar}
      {haftaBosMu && (
        <div className="px-3 py-2 text-[12px] font-bold text-slate-500 bg-white border-b shrink-0">
          Bu hafta {seciliEgitmen?.adi || 'seçili eğitmen'} için randevu yok.
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="flex w-full min-w-max">
          {/* sol: saat kolonu */}
          <div className="w-[68px] min-w-[68px] bg-white border-r sticky left-0 z-30">
            <div className="sticky top-0 z-40 bg-white">
              <div className="h-[46px] border-b border-slate-200 flex items-end justify-center pb-1 text-[9px] font-extrabold text-slate-400">
                SAAT
              </div>
            </div>
            <div style={{ height: totalHafta }}>
              {slots.map((t) => (
                <div key={t} style={{ height: rowHafta }} className="border-b text-right pr-2 pt-1">
                  <span
                    className={
                      t.endsWith(':00')
                        ? 'text-[11px] font-extrabold text-slate-700'
                        : 'text-[9px] text-slate-400'
                    }
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 7 gün */}
          {haftaGunleri.map((d, di) => {
            const iso = isoGun(d);
            const bugun = iso === bugunIso;
            const adet = (haftaGunMap[iso] || []).length;
            return (
              <div key={iso} className="flex-1 min-w-[152px] border-r flex flex-col">
                {/* gün başlığı */}
                <button
                  onClick={() => {
                    setSecilenTarih(iso);
                    setGorunum('iki');
                  }}
                  title="Bu günü Bugün + Yarın görünümünde aç"
                  className={`sticky top-0 z-20 h-[46px] border-b border-slate-200 flex flex-col items-center justify-center transition ${
                    bugun ? 'bg-amber-100 hover:bg-amber-200' : 'bg-white hover:bg-indigo-50'
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold uppercase ${
                      bugun ? 'text-amber-800' : 'text-slate-500'
                    }`}
                  >
                    {d.toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </span>
                  <span
                    className={`text-[14px] font-extrabold leading-none ${
                      bugun ? 'text-amber-800' : 'text-slate-900'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className={`text-[9px] font-bold ${adet > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
                    {adet} ders
                  </span>
                </button>

                {/* gövde: saatli kartlar */}
                <div className={`relative ${bugun ? 'bg-amber-50/40' : 'bg-[#fffef5]'}`} style={{ height: totalHafta }}>
                  {slots.map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b" style={{ top: i * rowHafta, height: rowHafta }} />
                  ))}
                  {haftaYukleniyor && di === 0 && (
                    <div className="text-center pt-6 text-[11px] font-bold text-slate-400">Yükleniyor...</div>
                  )}
                  {(haftaYerlesim[iso] || []).map(({ f, s, e, lane, serit }) => {
                    const top = ((s - start * 60) / slot) * rowHafta + 1;
                    const h = Math.max(((e - s) / slot) * rowHafta - 2, 30);
                    const isGrup = f.hizmetler?.tur === 'Grup';
                    const cap = f.hizmetler?.katilim_sayisi || 1;
                    const katilim = f.randevu_katilimcilari || [];
                    const iptal = f.durum === 'iptal edildi';
                    const tamam = f.durum === 'tamamlandı';
                    const egitmenIdx = (egitmenler || []).findIndex((x) => x.id === f.egitmen_id);
                    const renk = colors[(egitmenIdx < 0 ? 0 : egitmenIdx) % colors.length];
                    const musteri = katilim[0]?.musteriler?.adi || (isGrup ? 'Grup' : '—');
                    return (
                      <div
                        key={f.id}
                        onClick={() => onRandevuClick(f)}
                        title={`${fmtTime(f.baslangic_saati)}-${fmtTime(f.bitis_saati)} • ${f.hizmetler?.adi || ''}${isGrup ? ` • Grup ${katilim.length}/${cap}` : ''} — ${f.durum}`}
                        style={{
                          top,
                          height: h,
                          left: `calc(${(lane * 100) / serit}% + 2px)`,
                          width: `calc(${100 / serit}% - 4px)`,
                          borderColor: iptal ? '#cbd5e1' : tamam ? '#34d399' : renk,
                        }}
                        className={`absolute border-[1.5px] rounded-[5px] px-1 py-0.5 overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:z-10 transition ${
                          iptal ? 'bg-slate-50 opacity-60' : tamam ? 'bg-emerald-50' : 'bg-white'
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold leading-none whitespace-nowrap tracking-tight ${
                            iptal ? 'line-through text-slate-400' : 'text-slate-700'
                          }`}
                        >
                          {fmtTime(f.baslangic_saati)}-{fmtTime(f.bitis_saati)}
                        </div>
                        <div
                          className={`text-[10px] font-extrabold truncate leading-tight mt-0.5 ${
                            iptal ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {musteri}
                          {isGrup && katilim.length > 1 ? ` +${katilim.length - 1}` : ''}
                        </div>
                        {h >= 44 && (
                          <div className="text-[9px] leading-none mt-0.5 truncate text-slate-500">
                            {f.hizmetler?.adi}
                            {isGrup ? ` • ${katilim.length}/${cap}` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ---------------------- BUGÜN + YARIN (gün görünümü) ---------------------- */
  const gunGorunum = (
    <div
      className="flex flex-col h-full bg-[#fffef5] overflow-hidden select-none"
      onTouchStart={onStart}
      onTouchEnd={onEnd}
    >
      {ustBar}
      {loading ? (
        <div className="text-center py-10 text-xs md:text-[13px] font-bold text-slate-400">Yükleniyor...</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex w-full md:w-max">
            {/* ---------- SOL: SAAT KOLONU (sabit) ---------- */}
            <div className="w-[52px] min-w-[52px] md:w-[68px] md:min-w-[68px] bg-white border-r sticky left-0 z-30">
              {/* başlık bloğu: gün bandı + eğitmen satırı yüksekliği kadar, dikey kaydırmada sabit */}
              <div className="sticky top-0 z-40 bg-white">
                <div className="hidden md:flex h-[24px] border-b border-slate-200 bg-white items-center justify-center text-[9px] font-extrabold text-slate-400">
                  SAAT
                </div>
                <div className="h-[32px] md:h-[34px] border-b bg-white" />
              </div>
              <div style={{ height: total }}>
                {slots.map((t) => (
                  <div key={t} style={{ height: row }} className="border-b text-right pr-1.5 md:pr-2 pt-1">
                    <span
                      className={
                        t.endsWith(':00')
                          ? 'text-[11px] md:text-[12px] font-extrabold'
                          : 'text-[9px] md:text-[10px] text-slate-400'
                      }
                    >
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---------- GÜN GRUPLARI: Bugün | Yarın ---------- */}
            {gunler.map((g, gi) => {
              const buGun = g === bugunIso;
              const yarinMi = gunEtiket(g) === 'Yarın';
              return (
                <div
                  key={g}
                  className={`flex flex-col flex-1 min-w-0 md:flex-none ${
                    gi === gunler.length - 1 ? '' : 'md:mr-[76px]'
                  }`}
                >
                  {/* --- gün bandı (sticky) --- */}
                  <div className="sticky top-0 z-20">
                    <div
                      className={`hidden md:flex h-[24px] items-center justify-center gap-1.5 border-b border-slate-200 px-1 ${
                        buGun ? 'bg-amber-100' : yarinMi ? 'bg-indigo-100' : 'bg-slate-100'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wide ${
                          buGun ? 'text-amber-800' : yarinMi ? 'text-indigo-700' : 'text-slate-600'
                        }`}
                      >
                        {gunEtiket(g)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 truncate hidden md:inline">
                        {gunAltEtiket(g)}
                      </span>
                    </div>

                    {/* --- eğitmen adları --- */}
                    <div className="flex border-b bg-white">
                      {(egitmenler || []).map((e, i) => (
                        <div
                          key={e.id}
                          className="flex-1 md:flex-none md:min-w-[130px] md:basis-[130px] min-w-0 text-center py-2 md:py-2.5 text-[11px] md:text-[12px] font-extrabold text-white truncate md:px-2"
                          style={{ backgroundColor: colors[i % colors.length] }}
                        >
                          {e.adi}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* --- gövde: eğitmen kolonları --- */}
                  <div className="flex relative" style={{ height: total }}>
                    {(egitmenler || []).map((egt, idx) => (
                      <div
                        key={egt.id}
                        className={`flex-1 md:flex-none md:min-w-[130px] md:basis-[130px] min-w-0 relative border-r ${
                          gi === 0 ? 'bg-[#fffef5]' : 'bg-slate-50/60'
                        }`}
                      >
                        {slots.map((_, i) => (
                          <div key={i} className="absolute left-0 right-0 border-b" style={{ top: i * row, height: row }} />
                        ))}
                        {(groupedGun[g]?.[egt.id] || []).map((f) => {
                          const s = toMins(f.baslangic_saati);
                          const e = toMins(f.bitis_saati);
                          const top = ((s - start * 60) / slot) * row + 2;
                          const isGrup = f.hizmetler?.tur === 'Grup';
                          const cap = f.hizmetler?.katilim_sayisi || 1;
                          const katilim = f.randevu_katilimcilari || [];
                          // Grup: her katılımcı AYRI satırda (alt alta) → içerik yüksekliği satır sayısına göre
                          const satirSayisi = isGrup ? Math.max(katilim.length, 1) : 1;
                          // Kalabalık grupta yazı bir kademe küçülür → daha çok isim sığar
                          const kucukYazi = satirSayisi > 4;
                          const satirH = masaustu ? 16 : kucukYazi ? 11 : 13;
                          const icerikMin = (masaustu ? 34 : 28) + satirH * satirSayisi;
                          const ham = ((e - s) / slot) * row - 4;
                          // Çerçeve içerik sığmıyorsa biraz uzar (komşu kutuyla çakışmayı önlemek için en fazla +%40)
                          const h = Math.min(Math.max(ham, 50, icerikMin), Math.max(ham, 50) * 1.4 + 6);
                          return (
                            <div
                              key={f.id}
                              onClick={() => onRandevuClick(f)}
                              className="absolute left-[2px] right-[2px] bg-white border-[1.5px] rounded-[6px] px-1.5 py-1 shadow-sm overflow-hidden cursor-pointer md:hover:shadow-md md:hover:z-20 transition"
                              style={{ top, height: h, borderColor: colors[idx % colors.length] }}
                            >
                              {/* Saat TEK SATIR: boşluksuz yazım + nowrap → "20:00-20:50" alt satıra inmez */}
                              <div className="text-[9px] md:text-[10px] font-bold leading-none whitespace-nowrap tracking-tight">
                                {fmtTime(f.baslangic_saati)}-{fmtTime(f.bitis_saati)}
                              </div>
                              {isGrup ? (
                                <div className="mt-0.5">
                                  {katilim.length === 0 ? (
                                    <div className="text-[11px] md:text-[12px] font-extrabold leading-tight truncate text-slate-400">
                                      Katılımcı yok
                                    </div>
                                  ) : (
                                    katilim.map((x, xi) => (
                                      <div
                                        key={xi}
                                        className={`${kucukYazi ? 'text-[10px] md:text-[11px]' : 'text-[11px] md:text-[12px]'} font-extrabold leading-tight truncate`}
                                      >
                                        {x.musteriler?.adi}
                                      </div>
                                    ))
                                  )}
                                </div>
                              ) : (
                                <div className="text-[11px] md:text-[12px] font-extrabold truncate leading-tight mt-0.5">
                                  {katilim[0]?.musteriler?.adi || ''}
                                </div>
                              )}
                              <div className="text-[9px] md:text-[10px] leading-none mt-0.5 truncate text-slate-500">
                                {f.hizmetler?.adi}{isGrup ? ` • ${katilim.length}/${cap}` : ''}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return haftaMi ? haftaGorunum : gunGorunum;
}
