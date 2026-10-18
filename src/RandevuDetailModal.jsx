import React from 'react';
import { ModalShell, Button, ButtonOutline, fmtTutar, adSoyad } from './App';

export default function RandevuDetailModal({ randevu, musteriler, hizmetler, egitmenler, onClose, onEdit, onDelete, onTahsil, onSetDurum }) {
  const m = musteriler.find((x) => x.id === randevu.musteriId);
  const h = hizmetler.find((x) => x.id === randevu.hizmetId);
  const eg = egitmenler.find((x) => x.id === randevu.egitmenId);
  const kalan = Math.max(0, randevu.toplamTutar - randevu.odenenTutar);

  return (
    <ModalShell
      title="Seans Detayı"
      onClose={onClose}
      footer={
        <>
          <ButtonOutline onClick={onClose}>Kapat</ButtonOutline>
          {randevu.durum !== 'tamamlandi' && (
            <ButtonOutline
              onClick={() => onSetDurum(randevu.id, 'tamamlandi')}
              className="text-emerald-600 border-emerald-200"
            >
              Tamamlandı
            </ButtonOutline>
          )}
          {kalan > 0 && (
            <Button onClick={() => onTahsil(randevu)} className="bg-rose-600">
              Ödeme Tahsil
            </Button>
          )}
          <Button onClick={() => onEdit(randevu)}>Düzenle</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Müşteri</span><span className="font-bold text-slate-900">{m ? adSoyad(m) : '-'}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Hizmet</span><span className="font-bold text-slate-900">{h ? h.ad : '-'}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Eğitmen</span><span className="font-bold text-slate-900">{eg ? adSoyad(eg) : '-'}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Tarih</span><span className="font-bold text-slate-900">{randevu.tarih}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Saat</span><span className="font-bold text-slate-900">{randevu.baslangic} - {randevu.bitis}</span></div>
        <div className="border-t border-slate-200 pt-3 space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Toplam Tutar</span><span className="font-bold text-slate-900">{fmtTutar(randevu.toplamTutar)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Ödenen</span><span className="font-bold text-emerald-600">{fmtTutar(randevu.odenenTutar)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Kalan Borç</span><span className="font-bold text-rose-600">{fmtTutar(kalan)}</span></div>
        </div>
        <div className="flex justify-between items-center pt-2">
          <span className="text-slate-500">Durum</span>
          <span className={
            'text-xs font-bold rounded-full px-2 py-0.5 ' +
            (randevu.durum === 'tamamlandi' ? 'bg-emerald-100 text-emerald-600' :
             randevu.durum === 'iptal' ? 'bg-rose-100 text-rose-600' :
             'bg-violet-100 text-violet-600')
          }>
            {randevu.durum === 'tamamlandi' ? 'Tamamlandı' : randevu.durum === 'iptal' ? 'İptal' : 'Beklemede'}
          </span>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-200">
        <ButtonOutline onClick={() => onDelete(randevu)} className="w-full text-red-600 border-red-200">
          Tüm Seansları Sil
        </ButtonOutline>
      </div>
    </ModalShell>
  );
}
