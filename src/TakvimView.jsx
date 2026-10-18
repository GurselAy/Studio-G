import React, { useRef, useMemo } from 'react';

export default function TakvimView({ secilenTarih, setSecilenTarih, egitmenler, randevular, onRandevuClick }) {
  const start = 8;
  const end = 22;
  const slot = 30;
  const row = 40;
  const slots = useMemo(() => {
    const arr = [];
    for (let m = start * 60; m <= end * 60; m += slot) {
      arr.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return arr;
  }, []);
  const total = slots.length * row;
  const colors = ['#2563eb', '#16a34a', '#c026d3', '#f97316', '#0891b2', '#7c3aed'];

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
    const d = new Date(secilenTarih);
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    setSecilenTarih(d.toISOString().split('T')[0]);
  };

  const grouped = useMemo(() => {
    const m = {};
    egitmenler.forEach((e) => (m[e.id] = {}));
    randevular.forEach((r) => {
      if (!m[r.egitmen_id]) m[r.egitmen_id] = {};
      const k = r.grup_id || `${r.egitmen_id}_${new Date(r.baslangic_saati).getTime()}`;
      if (!m[r.egitmen_id][k]) m[r.egitmen_id][k] = [];
      m[r.egitmen_id][k].push(r);
    });
    return m;
  }, [egitmenler, randevular]);

  const visibleEgitmenler = useMemo(() => egitmenler, [egitmenler]);

  return (
    <div className="flex flex-col h-full bg-[#fffef5] overflow-hidden select-none" onTouchStart={onStart} onTouchEnd={onEnd}>
      <div className="flex border-b bg-white">
        <div className="w-[52px] min-w-[52px] border-r flex items-center justify-center text-[9px] font-extrabold">SAAT</div>
        <div className="flex-1 flex">
          {visibleEgitmenler.map((e, i) => (
            <div key={e.id} className="flex-1 min-w-0 text-center py-2 text-[11px] font-extrabold text-white truncate" style={{ backgroundColor: colors[i % colors.length] }}>
              {e.adi}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: total }}>
          <div className="w-[52px] min-w-[52px] bg-white border-r">
            {slots.map((t) => (
              <div key={t} style={{ height: row }} className="border-b text-right pr-1.5 pt-1">
                <span className={t.endsWith(':00') ? 'text-[11px] font-extrabold' : 'text-[9px] text-slate-400'}>{t}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 flex relative">
            {visibleEgitmenler.map((egt, idx) => (
              <div key={egt.id} className="flex-1 min-w-0 relative border-r bg-[#fffef5]">
                {slots.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-b" style={{ top: i * row, height: row }} />
                ))}
                {Object.values(grouped[egt.id] || {}).map((g) => {
                  const f = g[0];
                  const s = toMins(f.baslangic_saati);
                  const e = toMins(f.bitis_saati);
                  const top = ((s - start * 60) / slot) * row + 2;
                  const h = Math.max(((e - s) / slot) * row - 4, 50);
                  const isGrup = f.hizmetler?.tur === 'Grup';
                  const cap = f.hizmetler?.katilim_sayisi || 1;
                  const names = g.map((x) => x.musteriler?.adi?.split(' ')[0]).join(', ');
                  return (
                    <div key={f.id + egt.id} onClick={() => onRandevuClick(f)} className="absolute left-[2px] right-[2px] bg-white border-[1.5px] rounded-[6px] px-1.5 py-1 shadow-sm overflow-hidden cursor-pointer" style={{ top, height: h, borderColor: colors[idx % colors.length] }}>
                      <div className="text-[9px] font-bold leading-none">
                        {fmtTime(f.baslangic_saati)} - {fmtTime(f.bitis_saati)}
                      </div>
                      <div className="text-[11px] font-extrabold truncate leading-tight mt-0.5">
                        {isGrup ? names : f.musteriler?.adi}
                      </div>
                      <div className="text-[9px] truncate leading-none mt-0.5">
                        {f.hizmetler?.adi} {isGrup ? `• Grup ${g.length}/${cap}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}