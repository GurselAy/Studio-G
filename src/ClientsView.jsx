import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, fmtTutar, adSoyad, musteriBorc } from './App';
import OdemeModal from './OdemeModal';

export default function ClientsView(props) {
  const { musteriler, randevular, hizmetler, egitmenler, setActiveScreen, addMusteri, editMusteri, deleteMusteri, tahsilEt } = props;

  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editM, setEditM] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payRandevu, setPayRandevu] = useState(null);

  const [yAd, setYAd] = useState('');
  const [ySoyad, setYSoyad] = useState('');
  const [yTel, setYTel] = useState('');
  const [yEposta, setYEposta] = useState('');

  const [eAd, setEAd] = useState('');
  const [eSoyad, setESoyad] = useState('');
  const [eTel, setETel] = useState('');
  const [eEposta, setEEposta] = useState('');

  const filtered = musteriler.filter((m) =>
    [m.ad, m.soyad, m.telefon, m.email].join(' ').toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <ButtonOutline onClick={() => setActiveScreen('diger')} className="px-3 py-1.5 text-xs">← Menü</ButtonOutline>
          <span className="font-bold text-slate-900">Müşteriler</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ara..."
            className="rounded-lg px-3 py-2 border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 outline-none w-44"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button
            onClick={() => { setYAd(''); setYSoyad(''); setYTel(''); setYEposta(''); setAddOpen(true); }}
            className="px-3 py-1.5 text-xs"
          >
            + Müşteri
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {filtered.map((m) => {
            const borc = musteriBorc(m.id, randevular);
            const randevuSayisi = randevular.filter((r) => r.musteriId === m.id).length;
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">{adSoyad(m)}</span>
                    {borc > 0 && (
                      <span className="text-[10px] font-bold rounded-full bg-rose-100 text-rose-600 px-2 py-0.5">Borç var</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{m.telefon || '-'} · {m.email || '-'}</div>
                  <div className="text-sm font-medium text-slate-700 mt-2">
                    Toplam Borç:{' '}
                    <span className={borc > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {fmtTutar(Math.max(0, borc))}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Randevu: {randevuSayisi} · {hizmetler.length} hizmet · {egitmenler.length} eğitmen
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {borc > 0 ? (
                    <Button
                      onClick={() => {
                        const r = randevular.find(
                          (x) => x.musteriId === m.id && x.durum !== 'iptal' && x.odenenTutar < x.toplamTutar,
                        );
                        if (r) { setPayRandevu(r); setPayOpen(true); }
                      }}
                      className="px-3 py-1.5 text-xs bg-rose-600"
                    >
                      Ödeme Tahsil Et
                    </Button>
                  ) : (
                    <ButtonOutline
                      onClick={() => {
                        const r = randevular.find((x) => x.musteriId === m.id && x.durum !== 'iptal');
                        if (r) { setPayRandevu(r); setPayOpen(true); }
                      }}
                      className="px-3 py-1.5 text-xs"
                    >
                      Ödeme
                    </ButtonOutline>
                  )}
                  <ButtonOutline
                    onClick={() => {
                      setEditM(m);
                      setEAd(m.ad); setESoyad(m.soyad); setETel(m.telefon || ''); setEEposta(m.email || '');
                      setEditOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs"
                  >
                    Düzenle
                  </ButtonOutline>
                  <ButtonOutline
                    onClick={() => { if (confirm(adSoyad(m) + ' silinsin mi?')) deleteMusteri(m.id); }}
                    className="px-3 py-1.5 text-xs text-red-600 border-red-200"
                  >
                    Sil
                  </ButtonOutline>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">Müşteri bulunamadı.</div>
          )}
        </div>
      </div>

      {addOpen && (
        <ModalShell
          title="Yeni Müşteri"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <ButtonOutline onClick={() => setAddOpen(false)}>İptal</ButtonOutline>
              <Button
                onClick={() => {
                  if (!yAd) return;
                  addMusteri({ ad: yAd, soyad: ySoyad, telefon: yTel, email: yEposta });
                  setAddOpen(false);
                }}
              >
                Kaydet
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ad</label>
              <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={yAd} onChange={(e) => setYAd(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Soyad</label>
              <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={ySoyad} onChange={(e) => setYSoyad(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
            <NumericInput value={yTel} onChange={setYTel} placeholder="0532 000 00 00" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta</label>
            <input type="email" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={yEposta} onChange={(e) => setYEposta(e.target.value)} />
          </div>
        </ModalShell>
      )}

      {editOpen && editM && (
        <ModalShell
          title="Müşteri Düzenle"
          onClose={() => setEditOpen(false)}
          footer={
            <>
              <ButtonOutline onClick={() => setEditOpen(false)}>İptal</ButtonOutline>
              <Button
                onClick={() => {
                  editMusteri(editM.id, { ad: eAd, soyad: eSoyad, telefon: eTel, email: eEposta });
                  setEditOpen(false);
                }}
              >
                Kaydet
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ad</label>
              <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={eAd} onChange={(ev) => setEAd(ev.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Soyad</label>
              <input className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={eSoyad} onChange={(ev) => setESoyad(ev.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
            <NumericInput value={eTel} onChange={setETel} placeholder="0532 000 00 00" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-posta</label>
            <input type="email" className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none" value={eEposta} onChange={(ev) => setEEposta(ev.target.value)} />
          </div>
        </ModalShell>
      )}

      {payOpen && payRandevu && (
        <OdemeModal
          randevu={payRandevu}
          onClose={() => { setPayOpen(false); setPayRandevu(null); }}
          onTahsil={(t) => { tahsilEt(payRandevu.id, t); setPayOpen(false); setPayRandevu(null); }}
        />
      )}
    </div>
  );
}
