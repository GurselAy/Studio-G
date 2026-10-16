// TakvimView.jsx
// - 4 eğitmen tek ekrana sığar, flex-1 ile 10 eğitmen de olsa daralarak sığar, yatay scroll YOK
// - Saat kolonu 52px sabit, kayma yok
// - Dikey scroll serbest, yatayda swipe = tarih değiştirir (dikey kaydırmadan ayırt eder)
// - Kart yüksekliği: 40dk için min 44px, yazı taşma düzeltildi
// - Grup randevu: aynı saatteki kişiler tek kutuda "Ayşe, Fatma • Grup 2/6"
import React, { useRef } from 'react';

export default function TakvimView({ secilenTarih, setSecilenTarih, egitmenler, randevular, onRandevuClick }) {
  const startHour = 8; const endHour = 22; const slotMinutes = 30; const rowHeight = 36; // 32'den 36'ya çıkarıldı, kart sığsın diye
  const timeSlots = [];
  for (let m = startHour * 60; m <= endHour * 60; m += slotMinutes) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    timeSlots.push(`${h}:${mm}`);
  }
  const totalHeight = timeSlots.length * rowHeight;
  const colors = ['#2563eb','#16a34a','#c026d3','#f97316','#0891b2','#7c3aed'];
  const getColor = (i) => colors[i % colors.length];
  const toMins = (iso) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };

  // Swipe - sadece yatay hareket tarih değiştirsin, dikey scroll bozulmasın
  const touchStart = useRef({ x: 0, y: 0 });
  const onTouchStart = (e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return; // dikey kaydırma ise tarih değiştirme
    const d = new Date(secilenTarih);
    d.setDate(d.getDate() + (dx < 0 ? 1 : -1));
    setSecilenTarih(d.toISOString().split('T')[0]);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = secilenTarih === todayStr;
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const nowTop = ((nowMins - startHour * 60) / slotMinutes) * rowHeight;

  if (egitmenler.length === 0) return <div className="p-10 text-center text-xs font-bold text-slate-400">Eğitmen ekleyin</div>;

  // Aynı eğitmen + aynı başlangıç = tek kutu (grup için)
  const groupedByTrainer = {};
  egitmenler.forEach(egt => groupedByTrainer[egt.id] = {});
  randevular.forEach(r => {
    const key = new Date(r.baslangic_saati).getTime();
    if (!groupedByTrainer[r.egitmen_id]) groupedByTrainer[r.egitmen_id] = {};
    if (!groupedByTrainer[r.egitmen_id][key]) groupedByTrainer[r.egitmen_id][key] = [];
    groupedByTrainer[r.egitmen_id][key].push(r);
  });

  return (
    <div className="flex flex-col h-full bg-[#fffef5] overflow-hidden select-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Başlık */}
      <div className="flex border-b border-slate-300 bg-white">
        <div className="w-[52px] min-w-[52px] bg-white border-r border-slate-200 flex items-center justify-center text-[9px] font-extrabold text-slate-500">SAAT</div>
        <div className="flex-1 flex">
          {egitmenler.map((egt, i) => (
            <div key={egt.id} className="flex-1 min-w-0 text-center py-2 text-[11px] font-extrabold text-white border-r border-white/20 truncate px-1" style={{ backgroundColor: getColor(i) }}>{egt.adi}</div>
          ))}
        </div>
      </div>

      {/* Izgara */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: totalHeight }}>
          <div className="w-[52px] min-w-[52px] bg-white border-r border-slate-300">
            {timeSlots.map((t) => (
              <div key={t} style={{ height: rowHeight }} className={`border-b text-right pr-1.5 flex items-start justify-end pt-1 ${t.endsWith(':00') ? 'border-slate-300' : 'border-dashed border-slate-200'}`}>
                <span className={t.endsWith(':00') ? 'text-[11px] font-extrabold text-slate-900' : 'text-[9px] text-slate-400'}>{t}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 flex relative">
            {egitmenler.map((egt, colIdx) => (
              <div key={egt.id} className="flex-1 min-w-0 relative border-r border-slate-200 bg-[#fffef5]">
                {timeSlots.map((_, i) => (<div key={i} className={`absolute left-0 right-0 ${i % 2 === 0 ? 'border-b border-slate-300' : 'border-b border-dashed border-slate-200'}`} style={{ top: i * rowHeight, height: rowHeight }} />))}
                {Object.values(groupedByTrainer[egt.id] || {}).map((group) => {
                  const first = group[0];
                  const start = toMins(first.baslangic_saati); const end = toMins(first.bitis_saati);
                  const duration = end - start;
                  const top = ((start - startHour * 60) / slotMinutes) * rowHeight + 2;
                  const height = Math.max((duration / slotMinutes) * rowHeight - 4, 44); // min 44px, yazı taşmasın
                  const isGrup = first.hizmetler?.tur === 'Grup';
                  const kapasite = first.hizmetler?.katilim_sayisi || 1;
                  const isimler = group.map(g => g.musteriler?.adi?.split(' ')[0]).join(', ');
                  return (
                    <div key={first.baslangic_saati + egt.id} onClick={() => onRandevuClick(first)} className="absolute left-[2px] right-[2px] bg-white border-[1.5px] rounded-[6px] px-1.5 py-1 shadow-sm cursor-pointer overflow-hidden" style={{ top, height, borderColor: getColor(colIdx), zIndex: 10 }}>
                      <div className="text-[9px] font-bold text-slate-700 leading-none">{new Date(first.baslangic_saati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - {new Date(first.bitis_saati).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-[11px] font-extrabold truncate text-black leading-tight mt-0.5">{isGrup ? isimler : first.musteriler?.adi}</div>
                      <div className="text-[9px] truncate text-slate-600 leading-none mt-0.5">{first.hizmetler?.adi} {isGrup ? `• Grup ${group.length}/${kapasite}` : ''}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            {isToday && nowTop >= 0 && nowTop <= totalHeight && (<div className="absolute left-[52px] right-0 h-[2px] bg-red-500 z-30 pointer-events-none" style={{ top: nowTop }} />)}
          </div>
        </div>
      </div>
    </div>
  );
}