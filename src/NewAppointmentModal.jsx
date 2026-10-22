import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Package, Plus, Trash } from './Icons.jsx';

function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const tarihSaatYazi = (d) =>
  `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

function ilkHarfBuyuk(s) {
  const t = (s || '').trim();
  if (!t) return t;
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(t)) return t;
  return t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1);
}

// Paketin henüz takvime yerleştirilmemiş hakkı = kalan - planlı seanslar
async function planlanabilirHak(paket) {
  const { data } = await supabase
    .from('randevu_katilimcilari')
    .select('id, randevular(durum)')
    .eq('paket_id', paket.id);
  const planli = (data || []).filter((k) => k.randevular?.durum === 'planlandı').length;
  return paket.kalan_seans - planli;
}

export default function NewAppointmentModal({ isOpen, onClose, onSuccess, secilenTarih }) {
  const [musteriler, setMusteriler] = useState([]);
  const [hizmetler, setHizmetler] = useState([]);
  const [egitmenler, setEgitmenler] = useState([]);
  const [secilenMusteri, setSecilenMusteri] = useState('');
  const [secilenGrupMusteriler, setSecilenGrupMusteriler] = useState([]);
  const [yeniMusteriModu, setYeniMusteriModu] = useState(false);
  const [yeniMusteriAdi, setYeniMusteriAdi] = useState('');
  const [yeniMusteriTel, setYeniMusteriTel] = useState('');
  const [secilenHizmet, setSecilenHizmet] = useState('');
  const [secilenEgitmen, setSecilenEgitmen] = useState('');
  const [tarih, setTarih] = useState(secilenTarih);
  const [saat, setSaat] = useState('10:00');
  const [seansSayisi, setSeansSayisi] = useState('8');
  const [paketUcreti, setPaketUcreti] = useState('');
  const [tahsilEdilen, setTahsilEdilen] = useState('');
  const [mevcutPaket, setMevcutPaket] = useState(null); // { ...paket, planlanabilir }
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTarih(secilenTarih);
      setSecilenMusteri('');
      setSecilenGrupMusteriler([]);
      setYeniMusteriModu(false);
      setYeniMusteriAdi('');
      setYeniMusteriTel('');
      setPaketUcreti('');
      setTahsilEdilen('');
      setMevcutPaket(null);
      setHata(null);
      formVerileriniGetir();
    }
  }, [isOpen, secilenTarih]);

  useEffect(() => {
    if (secilenMusteri && secilenHizmet && !yeniMusteriModu) {
      aktifPaketKontrol(secilenMusteri, secilenHizmet);
    } else {
      setMevcutPaket(null);
    }
  }, [secilenMusteri, secilenHizmet, yeniMusteriModu]);

  const formVerileriniGetir = async () => {
    const { data: m } = await supabase.from('musteriler').select('*').eq('aktif', true).order('adi');
    if (m) setMusteriler(m);
    const { data: h } = await supabase.from('hizmetler').select('*').order('adi');
    if (h) {
      setHizmetler(h);
      if (!secilenHizmet && h[0]) setSecilenHizmet(h[0].id);
    }
    const { data: e } = await supabase.from('kullanicilar').select('*').order('adi');
    if (e) {
      setEgitmenler(e);
      if (!secilenEgitmen && e[0]) setSecilenEgitmen(e[0].id);
    }
  };

  const aktifPaketKontrol = async (musteriId, hizmetId) => {
    const { data } = await supabase
      .from('musteri_paketleri')
      .select('*')
      .eq('musteri_id', musteriId)
      .eq('hizmet_id', hizmetId)
      .eq('durum', true)
      .gt('kalan_seans', 0)
      .order('olusturma_tarihi', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data) return setMevcutPaket(null);
    setMevcutPaket({ ...data, planlanabilir: await planlanabilirHak(data) });
  };

  const hizmetDetay = hizmetler.find((h) => h.id === secilenHizmet);
  const isGrup = hizmetDetay?.tur === 'Grup';
  const kapasite = hizmetDetay?.katilim_sayisi || 1;
  const toplamSeans = parseInt(seansSayisi) || 0;

  // Bireysel + mevcut paketin hakkı yetiyorsa fiyat alanı gerekmez
  const paketYeterli = !isGrup && !yeniMusteriModu && mevcutPaket && mevcutPaket.planlanabilir >= toplamSeans;

  const grubaEkle = () => {
    if (!secilenMusteri) return;
    if (secilenGrupMusteriler.includes(secilenMusteri)) return;
    if (secilenGrupMusteriler.length >= kapasite) {
      setHata(`Kontenjan dolu (${kapasite} kişi)`);
      return;
    }
    setSecilenGrupMusteriler([...secilenGrupMusteriler, secilenMusteri]);
    setSecilenMusteri('');
  };

  const gruptanCikar = (id) => setSecilenGrupMusteriler(secilenGrupMusteriler.filter((x) => x !== id));

  const kaydet = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHata(null);
    const olusanPaketler = [];
    const olusanRandevuIds = [];
    const olusanKatilimciIds = [];

    try {
      if (!secilenEgitmen) throw new Error('Eğitmen seçin');
      if (!secilenHizmet) throw new Error('Hizmet seçin');
      if (toplamSeans < 1 || toplamSeans > 50) throw new Error('Seans sayısı 1-50 arası olmalı');

      // ---- 1. Müşteri listesi ----
      let musteriIds = isGrup ? [...secilenGrupMusteriler] : [];
      if (!isGrup && secilenMusteri && !yeniMusteriModu) musteriIds = [secilenMusteri];
      if (isGrup && secilenMusteri && !yeniMusteriModu && !musteriIds.includes(secilenMusteri)) {
        musteriIds.push(secilenMusteri);
      }
      if (yeniMusteriModu) {
        if (!yeniMusteriAdi.trim() || !yeniMusteriTel.trim()) throw new Error('Müşteri adı ve telefonu zorunlu');
      } else if (musteriIds.length === 0) {
        throw new Error(isGrup ? 'Grup için en az 1 müşteri seçin' : 'Müşteri seçin');
      }
      const kisiSayisi = musteriIds.length + (yeniMusteriModu ? 1 : 0);
      if (isGrup && kisiSayisi > kapasite) throw new Error(`Kontenjan ${kapasite} kişi`);

      // ---- 2. Seans tarihleri (yeni seri için) ----
      const sure = hizmetDetay?.sure || 50;
      const [y, m, d] = tarih.split('-').map(Number);
      const [sh, sm] = saat.split(':').map(Number);
      const proposed = [];
      for (let i = 0; i < toplamSeans; i++) {
        const start = new Date(y, m - 1, d + i * 7, sh, sm, 0);
        const end = new Date(start.getTime() + sure * 60000);
        proposed.push({ start, end, basStr: start.toISOString(), endStr: end.toISOString() });
      }

      // ---- 3. İlk slot: mevcut gruba katıl mı, yeni seri mi? ----
      const first = proposed[0];
      const { data: cakisan, error: ce } = await supabase
        .from('randevular')
        .select('id, seri_id, hizmet_id, baslangic_saati')
        .eq('egitmen_id', secilenEgitmen)
        .neq('durum', 'iptal edildi')
        .lt('baslangic_saati', first.endStr)
        .gt('bitis_saati', first.basStr);
      if (ce) throw ce;

      let hedefDersler = [];
      let joinSeri = false;

      if ((cakisan || []).length > 0) {
        if (!isGrup) throw new Error(`Eğitmen ${tarihSaatYazi(first.start)} tarihinde dolu`);
        const tek = cakisan.length === 1
          && cakisan[0].hizmet_id === secilenHizmet
          && new Date(cakisan[0].baslangic_saati).getTime() === first.start.getTime();
        if (!tek) throw new Error(`Eğitmen ${tarihSaatYazi(first.start)} tarihinde başka bir derste`);

        joinSeri = true;
        const { data: seriSeans, error: se } = await supabase
          .from('randevular')
          .select('id, baslangic_saati, bitis_saati, durum')
          .eq('seri_id', cakisan[0].seri_id)
          .eq('durum', 'planlandı')
          .order('baslangic_saati');
        if (se) throw se;
        hedefDersler = seriSeans || [];
        if (hedefDersler.length === 0) throw new Error('Bu grupta eklenecek planlı seans yok');
      } else {
        for (const p of proposed) {
          const { data: c, error: c2 } = await supabase
            .from('randevular')
            .select('id')
            .eq('egitmen_id', secilenEgitmen)
            .neq('durum', 'iptal edildi')
            .lt('baslangic_saati', p.endStr)
            .gt('bitis_saati', p.basStr);
          if (c2) throw c2;
          if ((c || []).length > 0) {
            throw new Error(`Eğitmen ${tarihSaatYazi(p.start)} tarihinde dolu`);
          }
        }
        hedefDersler = proposed.map((p) => ({
          id: null,
          baslangic_saati: p.basStr,
          bitis_saati: p.endStr,
          start: p.start,
        }));
      }

      const gerekliSeans = hedefDersler.length;

      // Kontenjan (mevcut grup)
      if (joinSeri) {
        const dersIds = hedefDersler.map((x) => x.id);
        const { data: kat } = await supabase
          .from('randevu_katilimcilari')
          .select('randevu_id, musteri_id')
          .in('randevu_id', dersIds);
        const sayac = {};
        (kat || []).forEach((k) => { sayac[k.randevu_id] = (sayac[k.randevu_id] || 0) + 1; });
        for (const ders of hedefDersler) {
          if ((sayac[ders.id] || 0) + kisiSayisi > kapasite) {
            throw new Error(`${tarihSaatYazi(new Date(ders.baslangic_saati))} grubu dolu! Mevcut ${sayac[ders.id] || 0}/${kapasite}`);
          }
          const zaten = (kat || []).filter((k) => k.randevu_id === ders.id && musteriIds.includes(k.musteri_id));
          if (zaten.length > 0) {
            const mAdi = musteriler.find((x) => x.id === zaten[0].musteri_id)?.adi || 'Müşteri';
            throw new Error(`${mAdi} zaten bu grupta`);
          }
        }
      }

      // Müşteri çakışması
      if (musteriIds.length > 0) {
        const { data: mevcutKat, error: me } = await supabase
          .from('randevu_katilimcilari')
          .select('musteri_id, randevular(baslangic_saati, bitis_saati, durum)')
          .in('musteri_id', musteriIds);
        if (me) throw me;
        for (const ders of hedefDersler) {
          const bas = new Date(ders.baslangic_saati).getTime();
          const bit = new Date(ders.bitis_saati).getTime();
          const busy = (mevcutKat || []).find((k) => {
            if (k.randevular?.durum === 'iptal edildi') return false;
            const b = new Date(k.randevular?.baslangic_saati).getTime();
            const e2 = new Date(k.randevular?.bitis_saati).getTime();
            return b < bit && e2 > bas;
          });
          if (busy) {
            const mAdi = musteriler.find((x) => x.id === busy.musteri_id)?.adi || 'Müşteri';
            throw new Error(`${mAdi} için ${tarihSaatYazi(new Date(ders.baslangic_saati))} tarihinde zaten randevu var`);
          }
        }
      }

      // ---- 4. Yeni müşteri ----
      if (yeniMusteriModu) {
        const adi = ilkHarfBuyuk(yeniMusteriAdi);
        const tel = yeniMusteriTel.trim();
        const { data: varOlan } = await supabase
          .from('musteriler')
          .select('id')
          .eq('adi', adi)
          .eq('telefon', tel)
          .limit(1);
        if (varOlan?.length) throw new Error('Bu müşteri zaten kayıtlı.');
        const { data, error } = await supabase
          .from('musteriler')
          .insert([{ adi, telefon: tel }])
          .select()
          .single();
        if (error) throw error;
        musteriIds.push(data.id);
      }
      
      // ---- 5. Paket bul veya oluştur ----
      const paketMap = {};
      const yeniPaketGereken = [];
      for (const mid of musteriIds) {
        const { data: adaylar } = await supabase
          .from('musteri_paketleri')
          .select('*')
          .eq('musteri_id', mid)
          .eq('hizmet_id', secilenHizmet)
          .eq('durum', true)
          .gt('kalan_seans', 0)
          .order('olusturma_tarihi', { ascending: true });
        for (const a of adaylar || []) {
          if ((await planlanabilirHak(a)) >= gerekliSeans) {
            paketMap[mid] = a.id;
            break;
          }
        }
        if (!paketMap[mid]) yeniPaketGereken.push(mid);
      }

      if (yeniPaketGereken.length > 0) {
        if (!paketUcreti) throw new Error('Paket fiyatı girilmeli');
        const ucret = parseFloat(paketUcreti) || 0;
        const odenen = Math.min(parseFloat(tahsilEdilen) || 0, ucret);
        let odemeDurumu = 'Ödenmedi';
        if (odenen >= ucret && ucret > 0) odemeDurumu = 'Ödendi';
        else if (odenen > 0) odemeDurumu = 'Kısmi Ödendi';

        for (const mid of yeniPaketGereken) {
          const { data: paket, error } = await supabase
            .from('musteri_paketleri')
            .insert([{
              musteri_id: mid,
              hizmet_id: secilenHizmet,
              toplam_seans: gerekliSeans,
              kalan_seans: gerekliSeans,
              ucret,
              odenen_tutar: odenen,
              odeme_durumu: odemeDurumu,
              durum: true,
            }])
            .select()
            .single();
          if (error) throw error;
          olusanPaketler.push(paket.id);
          paketMap[mid] = paket.id;

          if (odenen > 0) {
            const { error: oe } = await supabase
              .from('odeme_hareketleri')
              .insert([{ paket_id: paket.id, musteri_id: mid, tutar: odenen }]);
            if (oe) throw oe;
          }
        }
      }

      // ---- 6. Dersler + katılımcılar ----
      let dersIds = hedefDersler.map((x) => x.id).filter(Boolean);

      if (!joinSeri) {
        const seriId = genUUID();
        const insertList = proposed.map((p) => ({
          egitmen_id: secilenEgitmen,
          hizmet_id: secilenHizmet,
          seri_id: seriId,
          baslangic_saati: p.basStr,
          bitis_saati: p.endStr,
          durum: 'planlandı',
          yinelenen: toplamSeans > 1,
          tekrar_sayisi: toplamSeans > 1 ? toplamSeans : null,
          tekrar_araligi: toplamSeans > 1 ? 'Hafta' : null,
          egitmen_ucret: 0,
        }));
        const { data: dersler, error } = await supabase.from('randevular').insert(insertList).select('id');
        if (error) throw error;
        dersIds = (dersler || []).map((x) => x.id);
        olusanRandevuIds.push(...dersIds);
      }

      const katilimList = [];
      for (const rid of dersIds) {
        for (const mid of musteriIds) {
          katilimList.push({ randevu_id: rid, musteri_id: mid, paket_id: paketMap[mid] });
        }
      }
      const { data: katilan, error: ke } = await supabase
        .from('randevu_katilimcilari')
        .insert(katilimList)
        .select('id');
      if (ke) throw ke;
      olusanKatilimciIds.push(...(katilan || []).map((x) => x.id));

      onSuccess();
      onClose();
    } catch (err) {
      if (olusanKatilimciIds.length > 0) {
        await supabase.from('randevu_katilimcilari').delete().in('id', olusanKatilimciIds);
      }
      if (olusanRandevuIds.length > 0) {
        await supabase.rpc('studio_g_seanslari_sil', { p_ids: olusanRandevuIds });
      }
      for (const pid of olusanPaketler) {
        await supabase.rpc('studio_g_paketi_sil', { p_paket_id: pid });
      }
      setHata(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h2 className="text-[15px] font-extrabold text-slate-900">Yeni Randevu & Paket</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        {hata && <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100">{hata}</div>}
        <form onSubmit={kaydet} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-extrabold text-slate-900">Ders / Hizmet</label>
            <select
              value={secilenHizmet}
              onChange={(e) => { setSecilenHizmet(e.target.value); setSecilenGrupMusteriler([]); }}
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
            >
              {hizmetler.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.adi} ({h.sure} dk) {h.tur === 'Grup' ? `• Grup ${h.katilim_sayisi} kişi` : ''}
                </option>
              ))}
            </select>
            {isGrup && (
              <p className="text-[10px] font-bold text-amber-600 mt-1">
                Grup: Kontenjan {kapasite} kişi, ücret kişi başı. Aynı saatte mevcut grup varsa ona eklenir.
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-900">
                Müşteri {isGrup ? `(${secilenGrupMusteriler.length}/${kapasite})` : ''}
              </label>
              <button
                type="button"
                onClick={() => setYeniMusteriModu(!yeniMusteriModu)}
                className="text-[11px] font-bold text-[#5b46f5]"
              >
                {yeniMusteriModu ? 'Listeden Seç' : '+ Yeni Müşteri'}
              </button>
            </div>
            {yeniMusteriModu ? (
              <div className="space-y-2 bg-slate-50 p-2 rounded-xl">
                <input
                  value={yeniMusteriAdi}
                  onChange={(e) => setYeniMusteriAdi(ilkHarfBuyuk(e.target.value))}
                  placeholder="Ad Soyad"
                  className="w-full px-3 py-2.5 text-xs border rounded-xl font-bold"
                />
                <input
                  value={yeniMusteriTel}
                  onChange={(e) => setYeniMusteriTel(e.target.value.replace(/\D/g, ''))}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="05xx"
                  className="w-full px-3 py-2.5 text-xs border rounded-xl font-bold"
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={secilenMusteri}
                  onChange={(e) => setSecilenMusteri(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                >
                  <option value="">Seçin</option>
                  {musteriler
                    .filter((m) => !secilenGrupMusteriler.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.adi}</option>
                    ))}
                </select>
                {isGrup && (
                  <button type="button" onClick={grubaEkle} className="px-3 py-2 bg-[#5b46f5] text-white rounded-xl">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {isGrup && secilenGrupMusteriler.length > 0 && (
              <div className="mt-2 space-y-1">
                {secilenGrupMusteriler.map((id) => {
                  const m = musteriler.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex justify-between items-center bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                      <span>{m?.adi}</span>
                      <button type="button" onClick={() => gruptanCikar(id)}>
                        <Trash className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {!isGrup && mevcutPaket && !yeniMusteriModu && (
              <div className={`mt-2 p-2 rounded-xl border flex justify-between items-center ${
                paketYeterli ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <span className={`text-xs font-extrabold flex gap-1 ${paketYeterli ? 'text-emerald-800' : 'text-amber-800'}`}>
                  <Package className="w-4 h-4" />
                  Kalan: {mevcutPaket.kalan_seans}/{mevcutPaket.toplam_seans} • Boşta: {mevcutPaket.planlanabilir}
                </span>
                <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded shadow">
                  {paketYeterli ? 'Paketten' : 'Yeni paket'}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-slate-900">Eğitmen</label>
            <select
              value={secilenEgitmen}
              onChange={(e) => setSecilenEgitmen(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
            >
              {egitmenler.map((eg) => (
                <option key={eg.id} value={eg.id}>{eg.adi}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-extrabold text-slate-900">Tarih</label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full mt-1 px-2 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-slate-900">Saat</label>
              <input
                type="time"
                value={saat}
                onChange={(e) => setSaat(e.target.value)}
                className="w-full mt-1 px-2 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
              />
            </div>
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
            <div>
              <label className="text-[11px] font-extrabold text-slate-900">Toplam Seans</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={seansSayisi}
                onChange={(e) => setSeansSayisi(e.target.value.replace(/\D/g, ''))}
                className="w-full mt-1 px-3 py-2 bg-white border rounded-xl text-xs font-extrabold"
              />
            </div>
            {!paketYeterli && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-extrabold text-slate-900">
                    Paket Fiyatı (TL) {isGrup ? 'Kişi Başı *' : '*'}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="8000"
                    value={paketUcreti}
                    onChange={(e) => setPaketUcreti(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-2 py-2 bg-white border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-900">
                    Tahsil Edilen {isGrup ? 'Kişi Başı' : ''}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={tahsilEdilen}
                    onChange={(e) => setTahsilEdilen(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-1 px-2 py-2 bg-white border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            )}
            {tarih && (
              <p className="text-[10px] font-bold text-indigo-700 bg-white p-2 rounded-lg border">
                Not: Önümüzdeki {seansSayisi || 0} hafta boyunca her{' '}
                {new Date(tarih + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long' })} saat {saat}'e seanslar oluşturulacak.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#5b46f5] text-white rounded-xl text-xs font-extrabold shadow disabled:opacity-60"
          >
            {loading
              ? 'Kaydediliyor...'
              : `${seansSayisi || 0} Seanslık ${isGrup ? `Grup (${secilenGrupMusteriler.length + (yeniMusteriModu ? 1 : 0) || 1} kişi)` : 'Paket'} Oluştur`}
          </button>
        </form>
      </div>
    </div>
  );
}