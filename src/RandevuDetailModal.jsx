import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Plus } from './Icons.jsx';

const pad = (n) => String(n).padStart(2, '0');
const tl = (n) => parseFloat(n || 0).toLocaleString('tr-TR');

async function planlanabilirHak(paket) {
  const { data } = await supabase
    .from('randevu_katilimcilari')
    .select('id, randevular(durum)')
    .eq('paket_id', paket.id);
  const planli = (data || []).filter((k) => k.randevular?.durum === 'planlandı').length;
  return paket.kalan_seans - planli;
}

export default function RandevuDetailModal({ isOpen, onClose, randevu, onSuccess, egitmenler = [] }) {
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('');
  const [egitmenId, setEgitmenId] = useState('');
  const [durum, setDurum] = useState('planlandı');
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState(null);
  const [grupRandevular, setGrupRandevular] = useState([]);
  const [musteriler, setMusteriler] = useState([]);
  const [yeniMusteriId, setYeniMusteriId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [aday, setAday] = useState(undefined);
  const [paketUcreti, setPaketUcreti] = useState('');
  const [tahsilEdilen, setTahsilEdilen] = useState('');
  const [seriId, setSeriId] = useState(null);

  useEffect(() => {
    if (randevu) {
      const d = new Date(randevu.baslangic_saati);
      setTarih(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setSaat(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setEgitmenId(randevu.egitmen_id);
      setDurum(randevu.durum);
      setHata(null);
      setYeniMusteriId('');
      setAday(undefined);
      setPaketUcreti('');
      setTahsilEdilen('');
      if (randevu.seri_id) setSeriId(randevu.seri_id);
      else {
        supabase.from('randevular').select('seri_id').eq('id', randevu.id).single()
          .then(({ data }) => setSeriId(data?.seri_id || null));
      }
      fetchGrup();
      fetchMusteriler();
    }
  }, [randevu]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('kullanicilar').select('rol').eq('id', user.id).single();
      setIsAdmin(data?.rol === 'Admin');
    })();
  }, []);

  useEffect(() => {
    setAday(undefined);
    setPaketUcreti('');
    setTahsilEdilen('');
    if (!yeniMusteriId || !randevu?.hizmet_id || !seriId) return;
    let iptal = false;
    (async () => {
      const { data: seri } = await supabase
        .from('randevular')
        .select('id')
        .eq('seri_id', seriId)
        .gte('baslangic_saati', randevu.baslangic_saati)
        .neq('durum', 'iptal edildi');
      const hafta = (seri || []).length || 1;

      const { data: adaylar } = await supabase
        .from('musteri_paketleri')
        .select('id, kalan_seans')
        .eq('musteri_id', yeniMusteriId)
        .eq('hizmet_id', randevu.hizmet_id)
        .eq('durum', true)
        .gt('kalan_seans', 0)
        .order('olusturma_tarihi', { ascending: true });

      let bulunan = null;
      for (const p of adaylar || []) {
        if ((await planlanabilirHak(p)) >= hafta) { bulunan = p; break; }
      }
      if (!iptal) setAday({ paket: bulunan, hafta });
    })();
    return () => { iptal = true; };
  }, [yeniMusteriId, randevu, seriId]);

  const fetchGrup = async () => {
    if (!randevu?.id) return setGrupRandevular([]);
    const { data } = await supabase
      .from('randevu_katilimcilari')
      .select('id, musteri_id, paket_id, musteriler(adi, telefon)')
      .eq('randevu_id', randevu.id);
    setGrupRandevular(data || []);
  };

  const fetchMusteriler = async () => {
    const { data } = await supabase.from('musteriler').select('*').eq('aktif', true).order('adi');
    if (data) setMusteriler(data);
  };

  if (!isOpen || !randevu) return null;

  const isGrup = randevu.hizmetler?.tur === 'Grup';
  const kapasite = randevu.hizmetler?.katilim_sayisi || 1;
  const baslikAdi = isGrup
    ? grupRandevular.map((g) => g.musteriler?.adi).filter(Boolean).join(', ')
    : (grupRandevular[0]?.musteriler?.adi || randevu.randevu_katilimcilari?.[0]?.musteriler?.adi || '');

  const guncelle = async () => {
    setLoading(true);
    setHata(null);
    try {
      const sureMs = new Date(randevu.bitis_saati) - new Date(randevu.baslangic_saati);
      const [y, m, d] = tarih.split('-').map(Number);
      const [sh, sm] = saat.split(':').map(Number);
      const newStart = new Date(y, m - 1, d, sh, sm, 0);
      const newEnd = new Date(newStart.getTime() + sureMs);

      const { error } = await supabase
        .from('randevular')
        .update({
          baslangic_saati: newStart.toISOString(),
          bitis_saati: newEnd.toISOString(),
          egitmen_id: egitmenId,
          durum,
        })
        .eq('id', randevu.id);
      if (error) throw error;

      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const gruptanAyril = async (g) => {
    if (!g.paket_id) { setHata('Bu katılımcının paket bağlantısı yok.'); return; }
    setLoading(true);
    setHata(null);
    try {
      const { data: seanslar, error: se } = await supabase
        .from('randevu_katilimcilari')
        .select('id, randevular(durum, egitmen_ucret)')
        .eq('paket_id', g.paket_id);
      if (se) throw se;
      const liste = seanslar || [];
      const tamamlanan = liste.filter((s) => s.randevular?.durum === 'tamamlandı').length;
      const iptal = liste.filter((s) => s.randevular?.durum === 'iptal edildi').length;

      const { data: odemeler, error: oe } = await supabase
        .from('odeme_hareketleri').select('tutar').eq('paket_id', g.paket_id);
      if (oe) throw oe;
      const odeme = (odemeler || []).reduce((t, o) => t + parseFloat(o.tutar || 0), 0);

      const onay = window.confirm(
        `${g.musteriler?.adi} bu gruptan AYRILACAK.\n\nSilinecekler:\n` +
        `• Bu müşterinin seans kayıtları: ${liste.length} seans\n` +
        `   (${tamamlanan} tamamlanan, ${liste.length - tamamlanan - iptal} planlı, ${iptal} iptal)\n` +
        `• Ödemeler: ${tl(odeme)} TL\n\n` +
        `Diğer katılımcılar etkilenmez. Ders başkalarıyla duruyorsa eğitmen hakedişi silinmez.\n` +
        `Son kişi çıkarılırsa boş ders takvimden kalkar.\n` +
        `Bu işlem geri alınamaz. Emin misiniz?`
      );

      if (!onay) { setLoading(false); return; }

      const { data, error } = await supabase.rpc('studio_g_paketi_sil', { p_paket_id: g.paket_id });
      if (error) throw error;

      alert(
        `✅ ${g.musteriler?.adi} gruptan çıkarıldı.\n\n` +
        `• ${data.seans} seans kaydı silindi\n` +
        `• ${tl(data.odeme)} TL ödeme silindi`
      );

      await fetchGrup();
      onSuccess && onSuccess();
    } catch (e) {
      setHata(e.message.includes('yöneticiye') ? 'Bu işlemi yalnızca yönetici yapabilir.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  const grubaEkle = async () => {
    if (!yeniMusteriId) return;
    if (grupRandevular.length >= kapasite) return setHata('Kontenjan dolu!');
    if (grupRandevular.some((g) => g.musteri_id === yeniMusteriId)) return setHata('Bu müşteri zaten grupta.');
    setLoading(true);
    setHata(null);
    try {
      let vSeri = seriId;
      if (!vSeri) {
        const { data: srow } = await supabase
          .from('randevular').select('seri_id').eq('id', randevu.id).single();
        vSeri = srow?.seri_id || null;
      }
      if (!vSeri) throw new Error('Serisi bulunamadı, tekrar deneyin.');

      const { data: seri, error: se } = await supabase
        .from('randevular')
        .select('id, baslangic_saati, bitis_saati, durum')
        .eq('seri_id', vSeri)
        .gte('baslangic_saati', randevu.baslangic_saati)
        .neq('durum', 'iptal edildi')
        .order('baslangic_saati');
      if (se) throw se;
      const haftalar = seri || [];
      if (haftalar.length === 0) throw new Error('Seriye ait seans bulunamadı.');

      const dersIds = haftalar.map((h) => h.id);
      const { data: katilim, error: ke } = await supabase
        .from('randevu_katilimcilari')
        .select('randevu_id, musteri_id')
        .in('randevu_id', dersIds);
      if (ke) throw ke;
      const sayac = {};
      (katilim || []).forEach((k) => { sayac[k.randevu_id] = (sayac[k.randevu_id] || 0) + 1; });
      for (const h of haftalar) {
        if ((sayac[h.id] || 0) >= kapasite) {
          throw new Error(`${new Date(h.baslangic_saati).toLocaleDateString('tr-TR')} tarihindeki grup dolu (${kapasite}/${kapasite}).`);
        }
        if ((katilim || []).some((k) => k.randevu_id === h.id && k.musteri_id === yeniMusteriId)) {
          throw new Error('Bu müşteri zaten grupta.');
        }
      }

      const minBas = haftalar[0].baslangic_saati;
      const maxBit = haftalar.reduce((m, h) => (h.bitis_saati > m ? h.bitis_saati : m), haftalar[0].bitis_saati);
      const { data: mevcutKat, error: ce } = await supabase
        .from('randevu_katilimcilari')
        .select('musteri_id, randevular(baslangic_saati, bitis_saati, durum)')
        .eq('musteri_id', yeniMusteriId);
      if (ce) throw ce;
      for (const h of haftalar) {
        const cakisiyor = (mevcutKat || []).some((x) => {
          if (x.randevular?.durum === 'iptal edildi') return false;
          return new Date(x.randevular?.baslangic_saati) < new Date(h.bitis_saati) &&
            new Date(x.randevular?.bitis_saati) > new Date(h.baslangic_saati);
        });
        if (cakisiyor) {
          throw new Error(`Müşterinin ${new Date(h.baslangic_saati).toLocaleDateString('tr-TR')} tarihinde başka randevusu var.`);
        }
      }

      let paketId = aday?.paket?.id || null;
      if (!paketId) {
        const ucret = parseFloat(paketUcreti) || 0;
        if (ucret <= 0) throw new Error('Bu müşterinin boşta seans hakkı yok. Paket fiyatı girilmeli.');
        const odenen = Math.min(parseFloat(tahsilEdilen) || 0, ucret);
        let odemeDurumu = 'Ödenmedi';
        if (odenen >= ucret) odemeDurumu = 'Ödendi';
        else if (odenen > 0) odemeDurumu = 'Kısmi Ödendi';
        const { data: paket, error: pe } = await supabase
          .from('musteri_paketleri')
          .insert([{
            musteri_id: yeniMusteriId,
            hizmet_id: randevu.hizmet_id,
            toplam_seans: haftalar.length,
            kalan_seans: haftalar.length,
            ucret,
            odenen_tutar: odenen,
            odeme_durumu: odemeDurumu,
            durum: true,
          }])
          .select()
          .single();
        if (pe) throw pe;
        paketId = paket.id;
        if (odenen > 0) {
          const { error: oe } = await supabase
            .from('odeme_hareketleri')
            .insert([{ paket_id: paket.id, musteri_id: yeniMusteriId, tutar: odenen }]);
          if (oe) throw oe;
        }
      }

      const { error: ie } = await supabase.from('randevu_katilimcilari').insert(
        haftalar.map((h) => ({
          randevu_id: h.id,
          musteri_id: yeniMusteriId,
          paket_id: paketId,
        }))
      );
      if (ie) throw ie;

      setYeniMusteriId('');
      setAday(undefined);
      setPaketUcreti('');
      setTahsilEdilen('');
      await fetchGrup();
      onSuccess && onSuccess();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-[15px] font-extrabold text-slate-900">
            Randevu Detayı {isGrup ? `• Grup ${grupRandevular.length}/${kapasite}` : ''}
          </h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mt-3 space-y-3 text-xs">
          {hata && (
            <div className="p-2 bg-red-50 text-red-600 rounded text-[11px] font-bold border border-red-100">{hata}</div>
          )}

          {isGrup && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
              <div className="font-extrabold text-[12px] text-amber-800 mb-2">
                Katılımcılar ({grupRandevular.length}/{kapasite})
              </div>
              {grupRandevular.map((g) => (
                <div key={g.id} className="flex justify-between items-center gap-2 py-1.5 border-b last:border-0">
                  <span className="font-bold text-slate-800 min-w-0 truncate">{g.musteriler?.adi}</span>
                  {isAdmin && (
                    <button
                      onClick={() => gruptanAyril(g)}
                      disabled={loading}
                      className="px-2 py-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg shrink-0 disabled:opacity-50"
                    >
                      Gruptan Çıkar
                    </button>
                  )}
                </div>
              ))}
              {grupRandevular.length < kapasite && (
                <div className="flex gap-2 mt-2">
                  <select
                    value={yeniMusteriId}
                    onChange={(e) => setYeniMusteriId(e.target.value)}
                    className="flex-1 px-2 py-1.5 border rounded-lg bg-white font-bold text-[11px]"
                  >
                    <option value="">Müşteri seç</option>
                    {musteriler
                      .filter((m) => !grupRandevular.some((g) => g.musteri_id === m.id))
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.adi}</option>
                      ))}
                  </select>
                  <button
                    onClick={grubaEkle}
                    disabled={loading}
                    className="px-3 py-1.5 bg-[#5b46f5] text-white rounded-lg font-extrabold text-[11px] disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
              {yeniMusteriId && aday === undefined && (
                <p className="mt-1 text-[10px] font-bold text-slate-400">Paket kontrol ediliyor...</p>
              )}
              {yeniMusteriId && aday && aday.paket && (
                <p className="mt-1 text-[10px] font-bold text-emerald-700">
                  ✓ Mevcut paketten kullanılacak ({aday.hafta} hafta, boş hakkı yeterli)
                </p>
              )}
              {yeniMusteriId && aday && !aday.paket && (
                <div className="mt-2 bg-white border border-amber-300 rounded-lg p-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-700">
                    Boşta seans hakkı yok → kalan {aday.hafta} haftalık yeni paket oluşturulacak.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Paket Fiyatı *"
                      value={paketUcreti}
                      onChange={(e) => setPaketUcreti(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-2 py-1.5 border rounded-lg font-bold text-[11px]"
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Tahsil Edilen"
                      value={tahsilEdilen}
                      onChange={(e) => setTahsilEdilen(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-2 py-1.5 border rounded-lg font-bold text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl text-left">
            <div className="font-extrabold text-[14px] text-slate-900">{baslikAdi}</div>
            <div className="font-bold text-slate-600">{randevu.hizmetler?.adi}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-extrabold text-slate-900">Tarih</label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-xl bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-900">Saat</label>
              <input
                type="time"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-xl bg-slate-50 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="font-extrabold text-slate-900">Eğitmen</label>
            <select
              value={egitmenId}
              onChange={(e) => setEgitmenId(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
            >
              {egitmenler.map((eg) => (
                <option key={eg.id} value={eg.id}>{eg.adi}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-900">Durum</label>
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 border rounded-xl bg-slate-50 font-bold"
            >
              <option value="planlandı">Planlandı</option>
              <option value="tamamlandı">Tamamlandı</option>
              <option value="iptal edildi">İptal Edildi</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {isGrup
                ? 'Saat ve durum dersin kendisine yazılır, tüm katılımcılar aynı kalır. Tamamlandı: herkesin paketinden 1 seans düşer. Planlandı\'ya dönüşte seanslar iade edilir.'
                : 'Tamamlandı: seans düşer, hakediş eklenir. İptal: seans düşer, hakediş eklenmez. Planlandı\'ya geri alınırsa seans ve hakediş iade edilir.'}
            </p>
          </div>

          <button
            onClick={guncelle}
            disabled={loading}
            className="w-full py-3 bg-[#5b46f5] text-white rounded-xl font-extrabold disabled:opacity-60"
          >
            {loading ? 'Kaydediliyor...' : 'Güncelle'}
          </button>
        </div>
      </div>
    </div>
  );
}