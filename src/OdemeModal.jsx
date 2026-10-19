import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X } from './Icons.jsx';

export default function OdemeModal({ paket, musteri, onClose, onSuccess }) {
  const [ekOdeme, setEkOdeme] = useState('0');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (paket && paket.ucret != null) {
      const kalan = Math.max(0, parseFloat(paket.ucret) - parseFloat(paket.odenen_tutar || 0));
      setEkOdeme(String(kalan > 0 ? kalan : 0));
    }
  }, [paket]);

  if (!paket) return null;

  const kalan = Math.max(0, parseFloat(paket.ucret || 0) - parseFloat(paket.odenen_tutar || 0));

  const tahsilEt = async (e) => {
    e.preventDefault();
    setHata(null);
    setLoading(true);
    try {
      const ek = parseFloat(ekOdeme) || 0;
      if (ek <= 0) {
        setHata('Geçerli bir tutar girin');
        setLoading(false);
        return;
      }
      if (ek > kalan) {
        setHata(`Kalan borç: ${kalan} TL`);
        setLoading(false);
        return;
      }
      const yeniOdenen = parseFloat(paket.odenen_tutar || 0) + ek;
      let durum = 'Ödenmedi';
      if (yeniOdenen >= paket.ucret) durum = 'Ödendi';
      else if (yeniOdenen > 0) durum = 'Kısmi Ödendi';

      const { error } = await supabase
        .from('musteri_paketleri')
        .update({ odenen_tutar: yeniOdenen, odeme_durumu: durum })
        .eq('id', paket.id);
      if (error) {
        setHata('Veritabanı hatası: ' + error.message);
        setLoading(false);
        return;
      }
      await supabase.from('odeme_hareketleri').insert([
        { paket_id: paket.id, musteri_id: musteri.id, tutar: ek },
      ]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setHata('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">Ödeme Tahsil Et</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="mt-3 space-y-3 text-xs">
          {hata && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-[11px] font-bold border border-red-100">
              {hata}
            </div>
          )}
          <div className="bg-slate-50 p-3 rounded-xl">
            <div className="font-extrabold text-[13px] text-slate-900">{musteri?.adi || 'Müşteri'}</div>
            <div className="font-bold text-slate-600">
              {paket.hizmetler?.adi || 'Hizmet'} - {paket.toplam_seans} seans
            </div>
            <div className="mt-2 font-extrabold">
              Toplam: {paket.ucret} TL | Ödenen: {paket.odenen_tutar} TL |{' '}
              <span className={kalan > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                Kalan: {kalan} TL
              </span>
            </div>
          </div>
          <form onSubmit={tahsilEt} className="space-y-3">
            <div>
              <label className="font-extrabold text-slate-900">Ek Tahsilat Tutarı (TL)</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                min="1"
                max={kalan}
                value={ekOdeme}
                onChange={(e) => setEkOdeme(e.target.value.replace(/\D/g, ''))}
                placeholder={`Maks ${kalan} TL`}
                className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-extrabold"
              />
            </div>
            <button
              type="submit"
              disabled={loading || kalan <= 0}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-extrabold disabled:opacity-50"
            >
              {loading ? 'İşleniyor...' : 'Tahsilatı Onayla'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}