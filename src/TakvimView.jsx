import React, { useRef, useMemo, useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { useMasaustu } from './useMasaustu.js';

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
  const slots = useMemo(() => {
    const arr = [];
    for (let m = start * 60; m <= end * 60; m += slot) {
      arr.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return arr;
  }, []);
  const total = slots.length * row;
  const colors = ['#2563eb', '#16a34a', '#c026d3', '#f97316', '#0891b2', '#7c3aed'];

  const [randevular, setRandevular] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    randevulariGetir();
    gecmisRandevulariTamamlandiYap();
  }, [secilenTarih]);

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
  const randevulariGetir = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('randevular')
      .select('id, hizmet_id, egitmen_id, seri_id, baslangic_saati, bitis_saati, durum, hizmetler(adi, tur, katilim_sayisi), randevu_katilimcilari(musteri_id, paket_id, musteriler(adi, telefon))')
      .eq('durum', 'planlandı')
      .gte('baslangic_saati', secilenTarih + 'T00:00:00')
      .lte('baslangic_saati', secilenTarih + 'T23:59:59')
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

  const grouped = useMemo(() => {
    const m = {};
    (egitmenler || []).forEach((e) => (m[e.id] = []));
    (randevular || []).forEach((r) => {
      if (!m[r.egitmen_id]) m[r.egitmen_id] = [];
      m[r.egitmen_id].push(r);
    });
    return m;
  }, [egitmenler, randevular]);

  return (
    <div className="flex flex-col h-full bg-[#fffef5] overflow-hidden select-none" onTouchStart={onStart} onTouchEnd={onEnd}>
      <div className="flex border-b bg-white shrink-0">
        <div className="w-[52px] min-w-[52px] md:w-[68px] md:min-w-[68px] border-r flex items-center justify-center text-[9px] md:text-[10px] font-extrabold">SAAT</div>
        {/* PC'de çok eğitmen varsa kolonlar sıkışmasın: yatay kaydırma */}
        <div className="flex-1 flex overflow-x-auto md:overflow-x-auto">
          {(egitmenler || []).map((e, i) => (
            <div
              key={e.id}
              className="flex-1 md:flex-none min-w-0 md:min-w-[130px] text-center py-2 md:py-2.5 text-[11px] md:text-[12px] font-extrabold text-white truncate md:px-2"
              style={{ backgroundColor: colors[i % colors.length] }}
            >
              {e.adi}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden md:overflow-x-auto">
        {loading ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold text-slate-400">Yükleniyor...</div>
        ) : (
          <div className="flex md:min-w-max" style={{ height: total }}>
            <div className="w-[52px] min-w-[52px] md:w-[68px] md:min-w-[68px] bg-white border-r md:sticky md:left-0 md:z-10">
              {slots.map((t) => (
                <div key={t} style={{ height: row }} className="border-b text-right pr-1.5 md:pr-2 pt-1">
                  <span className={t.endsWith(':00') ? 'text-[11px] md:text-[12px] font-extrabold' : 'text-[9px] md:text-[10px] text-slate-400'}>{t}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 flex relative">
              {(egitmenler || []).map((egt, idx) => (
                <div key={egt.id} className="flex-1 md:flex-none md:min-w-[130px] md:basis-[130px] min-w-0 relative border-r bg-[#fffef5]">
                  {slots.map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b" style={{ top: i * row, height: row }} />
                  ))}
                  {(grouped[egt.id] || []).map((f) => {
                    const s = toMins(f.baslangic_saati);
                    const e = toMins(f.bitis_saati);
                    const top = ((s - start * 60) / slot) * row + 2;
                    const h = Math.max(((e - s) / slot) * row - 4, 50);
                    const isGrup = f.hizmetler?.tur === 'Grup';
                    const cap = f.hizmetler?.katilim_sayisi || 1;
                    const katilim = f.randevu_katilimcilari || [];
                    const names = katilim.map((x) => x.musteriler?.adi?.split(' ')[0]).join(', ');
                    return (
                      <div
                        key={f.id}
                        onClick={() => onRandevuClick(f)}
                        className="absolute left-[2px] right-[2px] bg-white border-[1.5px] rounded-[6px] px-1.5 py-1 shadow-sm overflow-hidden cursor-pointer md:hover:shadow-md md:hover:z-20 transition"
                        style={{ top, height: h, borderColor: colors[idx % colors.length] }}
                      >
                        <div className="text-[9px] md:text-[10px] font-bold leading-none">
                          {fmtTime(f.baslangic_saati)} - {fmtTime(f.bitis_saati)}
                        </div>
                        <div className="text-[11px] md:text-[12px] font-extrabold truncate leading-tight mt-0.5">
                          {isGrup ? names : (katilim[0]?.musteriler?.adi || '')}
                        </div>
                        <div className="text-[9px] md:text-[10px] truncate leading-none mt-0.5">
                          {f.hizmetler?.adi} {isGrup ? `• Grup ${katilim.length}/${cap}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
