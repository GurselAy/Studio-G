import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

// Satır sayısı 1000'i aşarsa sayfa sayfa çeker
const fetchAll = async (table, select = '*') => {
  const size = 1000;
  let from = 0;
  const out = [];
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + size - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < size) break;
    from += size;
  }
  return out;
};

const csvYap = (basliklar, satirlar) => {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (/[;"\n]/.test(s)) s = '"' + s.replaceAll('"', '""') + '"';
    return s;
  };
  return [basliklar.join(';'), ...satirlar.map((r) => r.map(esc).join(';'))].join('\r\n');
};

const indir = (ad, icerik) => {
  const blob = new Blob(['\uFEFF' + icerik], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${ad}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const iso = (v) => (v ? new Date(v).toLocaleString('tr-TR') : '');
const gun = (v) => (v ? new Date(v).toLocaleDateString('tr-TR') : '');

const DOSYALAR = [
  {
    ad: 'musteriler', etiket: 'Müşteriler',
    getir: async () => {
      const rows = await fetchAll('musteriler');
      return [
        ['Ad Soyad', 'Telefon', 'Aktif', 'Kayıt Tarihi'],
        rows.map((m) => [m.adi, m.telefon, m.aktif === false ? 'Pasif' : 'Aktif', gun(m.kayit_tarihi)]),
      ];
    },
  },
  {
    ad: 'paketler', etiket: 'Satılan Paketler',
    getir: async () => {
      const rows = await fetchAll('musteri_paketleri', '*, musteriler(adi), hizmetler(adi, tur, katilim_sayisi)');
      return [
        ['Müşteri','Hizmet','Tür','Katılımcı','Toplam Seans','Kalan Seans','Ücret','Ödenen','Ödeme Durumu','Paket Durumu','Oluşturma'],
        rows.map((p) => [p.musteriler?.adi, p.hizmetler?.adi, p.hizmetler?.tur, p.hizmetler?.katilim_sayisi, p.toplam_seans, p.kalan_seans, p.ucret, p.odenen_tutar, p.odeme_durumu, p.durum ? 'Aktif' : 'Pasif', gun(p.olusturma_tarihi)]),
      ];
    },
  },
  {
    ad: 'randevular', etiket: 'Seanslar',

    getir: async () => {
      const rows = await fetchAll('randevular', '*, hizmetler(adi, tur, katilim_sayisi), kullanicilar(adi), randevu_katilimcilari(musteriler(adi))');
      return [
        ['Müşteri', 'Hizmet', 'Tür', 'Katılımcı', 'Eğitmen', 'Başlangıç', 'Bitiş', 'Durum', 'Eğitmen Ücreti'],
        rows.map((r) => {
          const adlar = (r.randevu_katilimcilari || []).map((k) => k.musteriler?.adi).filter(Boolean).join(', ');
          return [adlar, r.hizmetler?.adi, r.hizmetler?.tur, r.hizmetler?.katilim_sayisi, r.kullanicilar?.adi, iso(r.baslangic_saati), iso(r.bitis_saati), r.durum, r.egitmen_ucret];
        }),
      ];
    },
  },
  {
    ad: 'odemeler', etiket: 'Ödeme Hareketleri',
    getir: async () => {
      const rows = await fetchAll('odeme_hareketleri', '*, musteriler(adi)');
      return [ ['Müşteri','Tutar','Tarih'], rows.map((o) => [o.musteriler?.adi, o.tutar, iso(o.tarih)]) ];
    },
  },
  {
    ad: 'egitmen_kazanc', etiket: 'Eğitmen Hakedişleri',
    getir: async () => {
      const rows = await fetchAll('egitmen_kazanc_hareketleri', '*, kullanicilar!egitmen_kazanc_hareketleri_egitmen_id_fkey(adi), randevular(randevu_katilimcilari(musteriler(adi)))');
      return [
        ['Eğitmen', 'Müşteri', 'Tutar', 'Tarih'],
        rows.map((k) => {
          const adlar = (k.randevular?.randevu_katilimcilari || []).map((x) => x.musteriler?.adi).filter(Boolean).join(', ');
          return [k.kullanicilar?.adi, adlar, k.tutar, iso(k.tarih)];
        }),
      ];
    },
  },
  {
    ad: 'egitmen_odemeleri', etiket: 'Eğitmen Ödemeleri',
    getir: async () => {
      const rows = await fetchAll('egitmen_maas_odemeleri', '*, kullanicilar!egitmen_maas_odemeleri_egitmen_id_fkey(adi)');
      return [ ['Eğitmen','Tutar','Tarih','Açıklama'], rows.map((o) => [o.kullanicilar?.adi, o.tutar, iso(o.tarih), o.aciklama]) ];
    },
  },
  {
    ad: 'giderler', etiket: 'İşletme Giderleri',
    getir: async () => {
      const rows = await fetchAll('isletme_giderleri', '*, kullanicilar(adi)');
      return [ ['Kategori','Açıklama','Tutar','Tarih','Eğitmen'], rows.map((g) => [g.kategori, g.aciklama, g.tutar, gun(g.tarih), g.kullanicilar?.adi]) ];
    },
  },
];

export default function YedekView() {
  const [hazirlanan, setHazirlanan] = useState(null);

  const yedekle = async (d) => {
    setHazirlanan(d.ad);
    try {
      const [basliklar, satirlar] = await d.getir();
      if (!satirlar.length) { alert('Kayıt yok, dosya oluşturulmadı.'); return; }
      indir(d.ad, csvYap(basliklar, satirlar));
    } catch (e) {
      alert('Yedek alınamadı: ' + e.message);
    } finally {
      setHazirlanan(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-3 space-y-2 overflow-y-auto">
      <div className="bg-white p-3 rounded-xl border">
        <h2 className="text-[14px] font-extrabold text-slate-900">Yedek (CSV)</h2>
        <p className="text-[11px] font-bold text-slate-500 mt-1">
          Her tabloyu Excel'de açılabilen CSV olarak indirir. Düzenli olarak bilgisayarınıza kaydedin.
        </p>
      </div>
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {DOSYALAR.map((d, idx) => (
          <button
            key={d.ad}
            onClick={() => yedekle(d)}
            disabled={hazirlanan !== null}
            className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 disabled:opacity-50 ${
              idx !== DOSYALAR.length - 1 ? 'border-b border-slate-50' : ''
            }`}
          >
            <span className="text-[14px] font-extrabold">{d.etiket}</span>
            <span className="text-[11px] font-extrabold text-[#5b46f5]">
              {hazirlanan === d.ad ? 'Hazırlanıyor...' : 'İndir'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}