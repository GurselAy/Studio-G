import React, { useState } from 'react';
import { ModalShell, Button, ButtonOutline, NumericInput, adSoyad, saatDk, dkSaate, fmtTutar, bugun } from './App';

export default function NewAppointmentModal({
  randevu, defaultDate, musteriler, hizmetler, egitmenler, onClose, onSave, onDelete,
}) {
  const [musteriId, setMusteriId] = useState(randevu?.musteriId || musteriler[0]?.id || '');
  const [hizmetId, setHizmetId] = useState(randevu?.hizmetId || hizmetler[0]?.id || '');
  const [egitmenId, setEgitmenId] = useState(randevu?.egitmenId || egitmenler[0]?.id || '');
  const [tarih, setTarih] = useState(randevu?.tarih || defaultDate || bugun);
  const [baslangic, setBaslangic] = useState(randevu?.baslangic || '10:00');
  const [sure, setSure] = useState(String(randevu?.sureDakika || hizmetler[0]?.sure || 40));
  const [durum, setDurum] = useState(randevu?.durum || 'beklemede');

  const hizmet = hizmetler.find((h) => h.id === hizmetId);
  const sureSecili = hizmet?.sure || parseInt(sure || '40', 10);
  const bitis = dkSaate(saatDk(baslangic) + sureSecili);

  return (
    <ModalShell
      title={randevu ? 'Randevu Düzenle' : 'Yeni Randevu'}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <ButtonOutline onClick={onDelete} className="text-red-600 border-red-200 mr-auto">
              Tümünü Sil
            </ButtonOutline>
          )}
          <ButtonOutline onClick={onClose}>İptal</ButtonOutline>
          <Button
            onClick={() => {
              if (!musteriId || !hizmetId || !egitmenId) return;
              onSave({ musteriId, hizmetId, egitmenId, tarih, baslangic, sureDakika: sureSecili, durum });
            }}
          >
            {randevu ? 'Güncelle' : 'Oluştur'}
          </Button>
        </>
      }
    >
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Müşteri</label>
        <select
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={musteriId}
          onChange={(e) => setMusteriId(e.target.value)}
        >
          {musteriler.map((m) => (
            <option key={m.id} value={m.id}>{adSoyad(m)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Hizmet</label>
        <select
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={hizmetId}
          onChange={(e) => {
            setHizmetId(e.target.value);
            const h = hizmetler.find((x) => x.id === e.target.value);
            if (h) setSure(String(h.sure));
          }}
        >
          {hizmetler.map((h) =>
            h.aktif ? <option key={h.id} value={h.id}>{h.ad} ({fmtTutar(h.fiyat)} · {h.sure}dk)</option> : null,
          )}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Eğitmen</label>
        <select
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={egitmenId}
          onChange={(e) => setEgitmenId(e.target.value)}
        >
          {egitmenler.map((eg) => (
            <option key={eg.id} value={eg.id}>{adSoyad(eg)}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
          <input
            type="date"
            className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Başlangıç</label>
          <input
            type="time"
            className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Süre (dakika)</label>
        <NumericInput
          value={sure}
          onChange={setSure}
          placeholder="40"
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
        />
        <p className="text-xs text-slate-500 mt-1">
          Bitiş: <span className="font-semibold">{bitis}</span>
        </p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Durum</label>
        <select
          className="w-full rounded-lg px-4 py-2 border border-slate-300 focus:ring-2 focus:ring-violet-500 outline-none"
          value={durum}
          onChange={(e) => setDurum(e.target.value)}
        >
          <option value="beklemede">Beklemede</option>
          <option value="tamamlandi">Tamamlandı</option>
          <option value="iptal">İptal</option>
        </select>
      </div>
    </ModalShell>
  );
}
