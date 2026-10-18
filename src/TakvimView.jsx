import React, { useState, useMemo } from 'react';
import { fmtTutar, fmtTarihUzun, saatDk, dkSaate, adSoyad, Button, ButtonOutline, ModalShell, NumericInput, bugun } from './App';
import NewAppointmentModal from './NewAppointmentModal';
import RandevuDetailModal from './RandevuDetailModal';
import OdemeModal from './OdemeModal';

const DAY_START = 8 * 60;       // 08:00
const DAY_END = 21 * 60;        // 21:00
const PX_PER_MIN = 1;           // 1 dakika = 1 px
const DAY_HEIGHT = (DAY_END - DAY_START) * PX_PER_MIN; // 780px

export default function TakvimView(props) {
  const {
    user, role, randevular, egitmenler, musteriler, hizmetler,
    selectedDate, setSelectedDate, setActiveScreen,
    addRandevu, updateRandevu, deleteRandevuGrup, setRandevuDurum,
    tahsilEt, iadeEt,
  } = props;

  const [open, setOpen] = useState(false);
  const [editRandevu, setEditRandevu] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payRandevu, setPayRandevu] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRandevu, setDetailRandevu] = useState(null);
  const [touchStart, setTouchStart] = useState(null);

  /* Egitmen kendi kolonunda once */
  const visibleEgitmenler = useMemo(() => {
    const list = [...egitmenler];
    if (role === 'egitmen' && user) {
      list.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0));
    }
    return list;
  }, [egitmenler, role, user]);

  const gunDegistir = (yon) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + yon);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const randevularGun = useMemo(
    () => randevular.filter((r) => r.tarih === selectedDate && r.durum !== 'iptal'),
    [randevular, selectedDate],
  );

  const kartlarByEgitmen = useMemo(() => {
    const map = {};
    visibleEgitmenler.forEach((e) => { map[e.id] = []; });
    randevularGun.forEach((r) => {
      if (!map[r.egitmenId]) map[r.egitmenId] = [];
      map[r.egitmenId].push(r);
    });
    if (role === 'egitmen' && user) {
      Object.keys(map).forEach((id) => {
        if (id !== user.id) map[id] = [];
        else map[id] = map[id].filter((r) => r.durum !== 'tamamlandi');
      });
    }
    return map;
  }, [randevularGun, visibleEgitmenler, role, user]);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(dx) > 60) gunDegistir(dx < 0 ? 1 : -1);
    setTouchStart(null);
  };

  const handleSave = (r) => {
    if (editRandevu) updateRandevu(editRandevu.id, r);
    else addRandevu(r);
    setOpen(false);
    setEditRandevu(null);
  };

  return (
    <div className="h-full flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
          <span className="font-bold text-slate-900 text-sm">{fmtTarihUzun(selectedDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ButtonOutline onClick={() => gunDegistir(-1)} className="px-3 py-1.5 text-xs">‹</ButtonOutline>
          <Button onClick={() => { setEditRandevu(null); setOpen(true); }} className="px-3 py-1.5 text-xs">+ Seans</Button>
          <ButtonOutline onClick={() => gunDegistir(1)} className="px-3 py-1.5 text-xs">›</ButtonOutline>
        </div>
      </div>

      <div
        className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div className="flex" style={{ minWidth: '100%' }}>
          {/* Saat kolonu */}
          <div className="flex-none w-20 shrink-0 border-r border-slate-200 bg-white">
            <div className="h-9" />
            <div className="relative" style={{ height: `${DAY_HEIGHT}px` }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const h = 8 + i;
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-[10px] text-slate-400 font-medium text-right pr-2 -translate-y-2"
                    style={{ top: `${i * 60 * PX_PER_MIN}px` }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>
          </div>

          {/* Egitmen kolonlari */}
          {visibleEgitmenler.map((eg) => {
            const kartlar = kartlarByEgitmen[eg.id] || [];
            const isMe = role === 'egitmen' && user && eg.id === user.id;
            return (
              <div key={eg.id} className="flex-none w-64 border-r border-slate-200 bg-white flex flex-col">
                <div
                  className={
                    'px-3 py-2 text-xs font-bold border-b border-slate-200 shrink-0 ' +
                    (isMe ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600')
                  }
                >
                  {isMe ? '● ' : ''}{adSoyad(eg)}{isMe ? ' (siz)' : ''}
                </div>
                <div className="relative flex-1" style={{ height: `${DAY_HEIGHT}px` }}>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: `${i * 60 * PX_PER_MIN}px` }}
                    />
                  ))}
                  {kartlar.map((r) => {
                    const m = musteriler.find((x) => x.id === r.musteriId);
                    const h = hizmetler.find((x) => x.id === r.hizmetId);
                    const top = (saatDk(r.baslangic) - DAY_START) * PX_PER_MIN;
                    const height = Math.max(r.sureDakika, 20) * PX_PER_MIN;
                    const bg = r.durum === 'tamamlandi' ? 'bg-emerald-500' : 'bg-violet-600';
                    return (
                      <div
                        key={r.id}
                        className={`absolute left-1 right-1 rounded-lg text-white text-xs shadow ${bg} cursor-pointer`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                        onClick={() => { setDetailRandevu(r); setDetailOpen(true); }}
                      >
                        <div className="px-2 py-1 overflow-hidden h-full">
                          <div className="font-bold truncate">{m ? adSoyad(m) : 'Müşteri'}</div>
                          <div className="text-[10px] opacity-90 truncate">
                            {h ? h.ad : ''} · {r.baslangic}-{r.bitis}
                          </div>
                          <div className="text-[10px] opacity-90 mt-0.5">
                            {fmtTutar(r.toplamTutar)} · {r.odenenTutar > 0 ? `Ödenen ${fmtTutar(r.odenenTutar)}` : '0 ödenen'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Yeni / duzenle randevu */}
      {open && (
        <NewAppointmentModal
          randevu={editRandevu}
          defaultDate={selectedDate}
          musteriler={musteriler}
          hizmetler={hizmetler}
          egitmenler={egitmenler}
          onClose={() => { setOpen(false); setEditRandevu(null); }}
          onSave={handleSave}
          onDelete={editRandevu ? () => { setOpen(false); setDelOpen(true); } : undefined}
        />
      )}

      {/* Tüm seansları sil */}
      {delOpen && editRandevu && (
        <ModalShell
          title="Tüm Seansları Sil"
          onClose={() => setDelOpen(false)}
          footer={
            <>
              <ButtonOutline onClick={() => setDelOpen(false)}>Vazgeç</ButtonOutline>
              <Button
                onClick={() => {
                  deleteRandevuGrup(editRandevu);
                  setDelOpen(false);
                  setEditRandevu(null);
                }}
              >
                Tümünü Sil
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Bu randevuyla ilişkili <strong>tüm seanslar</strong> silinecek. Bağlı ödemeler ve eğitmen
            kazanç hareketleri de kaldırılacak. Bu işlem geri alınamaz.
          </p>
        </ModalShell>
      )}

      {/* Ödeme tahsil */}
      {payOpen && payRandevu && (
        <OdemeModal
          randevu={payRandevu}
          onClose={() => { setPayOpen(false); setPayRandevu(null); }}
          onTahsil={(t) => { tahsilEt(payRandevu.id, t); setPayOpen(false); setPayRandevu(null); }}
        />
      )}

      {/* Kart detayi (uzun basma / tek tiklama) */}
      {detailOpen && detailRandevu && (
        <RandevuDetailModal
          randevu={detailRandevu}
          musteriler={musteriler}
          hizmetler={hizmetler}
          egitmenler={egitmenler}
          onClose={() => { setDetailOpen(false); setDetailRandevu(null); }}
          onEdit={(r) => { setDetailOpen(false); setEditRandevu(r); setOpen(true); }}
          onDelete={(r) => { setDetailOpen(false); setEditRandevu(r); setDelOpen(true); }}
          onTahsil={(r) => { setDetailOpen(false); setPayRandevu(r); setPayOpen(true); }}
          onSetDurum={setRandevuDurum}
        />
      )}
    </div>
  );
}
