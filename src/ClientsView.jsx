import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import OdemeModal from './OdemeModal.jsx';
import MusteriDetayModal from './MusteriDetayModal.jsx';
import RandevuDetailModal from './RandevuDetailModal.jsx';
import PhoneInput, { telNorm, telKaydet, telGecerli } from './PhoneInput.jsx';
import { Plus, Phone, MessageSquare, Search, X, Trash, CreditCard, Edit } from './Icons.jsx';

function ilkHarfBuyuk(s) {
  const t = s || '';
  if (!t) return t;
  const first = t.charAt(0);
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(first)) return t;
  return first.toLocaleUpperCase('tr-TR') + t.slice(1);
}

const tl = (n) => parseFloat(n || 0).toLocaleString('tr-TR');

export default function ClientsView({ userRole }) {
  const isAdmin = userRole === 'Admin';
  const [musteriler, setMusteriler] = useState([]);
  const [arama, setArama] = useState('');
  const [filter, setFilter] = useState('tumu');
  const [loading, setLoading] = useState(true);
  const [musteriModal, setMusteriModal] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [duzenleAd, setDuzenleAd] = useState('');
  const [duzenleTel, setDuzenleTel] = useState('');
  const [odeme, setOdeme] = useState(null);
  const [detayMusteri, setDetayMusteri] = useState(null);
  const [detayRandevu, setDetayRandevu] = useState(null);
  const [egitmenler, setEgitmenler] = useState([]);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniTel, setYeniTel] = useState('');
  const [grupDoluluk, setGrupDoluluk] = useState({});

  useEffect(() => { getir(); }, []);

  const getir = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('musteriler')
      .select(`*, musteri_paketleri(*, hizmetler(adi, tur, katilim_sayisi))`)
      .order('adi');
    if (data) setMusteriler(data);

    const grupPaketIds = (data || [])
      .flatMap((m) => m.musteri_paketleri || [])
      .filter((p) => p.durum && p.kalan_seans > 0 && p.hizmetler?.tur === 'Grup')
      .map((p) => p.id);

    const doluluk = {};
    if (grupPaketIds.length > 0) {
      const { data: kat } = await supabase
        .from('randevu_katilimcilari')
        .select('paket_id, randevu_id, randevular(baslangic_saati, durum)')
        .in('paket_id', grupPaketIds);

      const paketDers = {};
      grupPaketIds.forEach((pid) => {
        const s = (kat || []).filter((k) => k.paket_id === pid && k.randevular)
          .sort((a, b) => new Date(a.randevular.baslangic_saati) - new Date(b.randevular.baslangic_saati));
        const siradaki = s.find((k) => k.randevular.durum === 'planlandı') || s[s.length - 1];
        if (siradaki) paketDers[pid] = siradaki.randevu_id;
      });

      const dersIds = [...new Set(Object.values(paketDers))];
      if (dersIds.length > 0) {
        const { data: hepsi } = await supabase
          .from('randevu_katilimcilari')
          .select('randevu_id')
          .in('randevu_id', dersIds);
        const sayac = {};
        (hepsi || []).forEach((g) => { sayac[g.randevu_id] = (sayac[g.randevu_id] || 0) + 1; });
        Object.entries(paketDers).forEach(([pid, rid]) => { doluluk[pid] = sayac[rid] || 1; });
      }
    }
    setGrupDoluluk(doluluk);

    const { data: eg } = await supabase.from('kullanicilar').select('id,adi').order('adi');
    if (eg) setEgitmenler(eg);
    setLoading(false);
  };

  const ekle = async (e) => {
    e.preventDefault();
    if (!yeniAd || !yeniTel) return;
    const adi = ilkHarfBuyuk(yeniAd).trim();
    const tel = telKaydet(yeniTel);
    if (!telGecerli(tel)) {
      alert('Telefon 10 hane olmalı (5xx xxx xx xx).');
      return;
    }
    const n = telNorm(tel);
    const adiK = adi.toLocaleLowerCase('tr-TR');
    const varOlan = (musteriler || []).some(
      (m) =>
        telNorm(m.telefon) === n &&
        (m.adi || '').trim().toLocaleLowerCase('tr-TR') === adiK
    );
    if (varOlan) {
      alert('Bu müşteri zaten kayıtlı.');
      return;
    }
    await supabase.from('musteriler').insert([{ adi, telefon: tel }]);
    setYeniAd(''); setYeniTel(''); setMusteriModal(false);
    getir();
  };

  const duzenleAc = (m, e) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setDuzenle(m);
    setDuzenleAd(m.adi || '');
    setDuzenleTel(m.telefon || '');
  };

  const duzenleKaydet = async (e) => {
    e.preventDefault();
    if (!duzenle) return;
    const adi = ilkHarfBuyuk(duzenleAd).trim();
    const tel = telKaydet(duzenleTel);
    if (!adi) return;
    if (!telGecerli(tel)) {
      alert('Telefon 10 hane olmalı (5xx xxx xx xx).');
      return;
    }
    const n = telNorm(tel);
    const adiK = adi.toLocaleLowerCase('tr-TR');
    const varOlan = (musteriler || []).some(
      (m) =>
        m.id !== duzenle.id &&
        telNorm(m.telefon) === n &&
        (m.adi || '').trim().toLocaleLowerCase('tr-TR') === adiK
    );
    if (varOlan) {
      alert('Bu müşteri zaten kayıtlı.');
      return;
    }
    const { error } = await supabase.from('musteriler').update({ adi, telefon: tel }).eq('id', duzenle.id);
    if (error) { alert(error.message); return; }
    setDuzenle(null);
    getir();
  };

  const sil = async (id, ad) => {
    if (!isAdmin) { alert('Sadece yönetici silebilir'); return; }

    const { data: paketler } = await supabase
      .from('musteri_paketleri')
      .select('id, odenen_tutar, durum, kalan_seans, hizmetler(adi, tur)')
      .eq('musteri_id', id);
    const { data: kat } = await supabase
      .from('randevu_katilimcilari')
      .select('id, randevular(durum)')
      .eq('musteri_id', id);

    const seanslar = (kat || []).filter((k) => k.randevular);
    const planli = seanslar.filter((s) => s.randevular.durum === 'planlandı').length;
    const tamam = seanslar.filter((s) => s.randevular.durum === 'tamamlandı').length;
    const iptal = seanslar.filter((s) => s.randevular.durum === 'iptal edildi').length;
    const odemeToplam = (paketler || []).reduce((t, p) => t + parseFloat(p.odenen_tutar || 0), 0);
    const aktifPaket = (paketler || []).filter((p) => p.durum && p.kalan_seans > 0).length;
    const isGrup = (paketler || []).some((p) => p.hizmetler?.tur === 'Grup');

    let msg = `"${ad}" KALICI olarak silinecek.\n\n`;
    if (planli > 0) msg += `⚠️ Aktif (planlı) randevu var: ${planli} seans\n\n`;
    msg += `Silinecekler:\n`;
    msg += `• Paketler: ${(paketler || []).length} (${aktifPaket} aktif)\n`;
    msg += `• Seans kayıtları: ${seanslar.length} (${planli} planlı, ${tamam} tamamlanan, ${iptal} iptal)\n`;
    msg += `• Ödemeler: ${tl(odemeToplam)} TL\n`;
    if (isGrup) {
      msg += `\nℹ️ Grup: Sadece bu müşteri çıkarılır. Ders başkalarıyla duruyorsa eğitmen hakedişi silinmez.\nSon kişi ise boş ders takvimden kalkar.\n`;
    }
    msg += `\nBu işlem geri alınamaz. Emin misiniz?`;
    if (!confirm(msg)) return;

    for (const p of paketler || []) {
      const { error } = await supabase.rpc('studio_g_paketi_sil', { p_paket_id: p.id });
      if (error) {
        alert(error.message.includes('yöneticiye') ? 'Silme işlemini yalnızca yönetici yapabilir.' : error.message);
        return;
      }
    }
    await supabase.from('musteriler').delete().eq('id', id);
    getir();
  };

  const wa = (tel) => {
    let c = (tel || '').replace(/\D/g, '');
    if (!c) return;
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  const aktifPaketler = (m) => {
    if (!m.musteri_paketleri) return [];
    return m.musteri_paketleri.filter((p) => p.durum && p.kalan_seans > 0);
  };
  const toplamBorc = (m) => aktifPaketler(m).reduce((s, p) => s + (p.ucret - p.odenen_tutar), 0);

  const filtreli = musteriler.filter((m) => {
    const okArama = m.adi.toLowerCase().includes(arama.toLowerCase()) || (m.telefon || '').includes(arama);
    if (!okArama) return false;
    if (filter === 'pasif') return m.aktif === false;
    if (m.aktif === false) return false;
    if (filter === 'borclu') return toplamBorc(m) > 0;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 md:px-5 md:py-4 border-b shrink-0">
        <div className="flex justify-between items-center mb-3 md:mb-0 md:gap-4">
          <div>
            <h1 className="text-[18px] md:text-[20px] font-extrabold text-slate-900">Müşteriler</h1>
            <p className="text-[11px] md:text-[12px] font-bold text-slate-500">{filtreli.length} üye</p>
          </div>
          <button onClick={() => setMusteriModal(true)} className="w-9 h-9 md:w-auto md:h-auto md:px-4 md:py-2 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-full md:rounded-xl flex items-center justify-center gap-1.5 transition md:ml-auto">
            <Plus className="w-5 h-5 md:w-4 md:h-4" />
            <span className="hidden md:inline text-[12px] font-extrabold">Yeni Müşteri</span>
          </button>
        </div>
        <div className="md:flex md:items-center md:gap-3 md:mt-3">
          <div className="relative mb-2 md:mb-0 md:max-w-sm md:flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="İsim veya telefon ara..." className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs md:text-[13px] font-bold md:hover:border-slate-300 transition" />
          </div>
          <div className="flex gap-1.5 md:shrink-0">
            <button onClick={() => setFilter('tumu')} className={`px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-[12px] font-extrabold transition ${filter === 'tumu' ? 'bg-slate-900 text-white' : 'bg-slate-100 md:hover:bg-slate-200'}`}>Tümü</button>
            <button onClick={() => setFilter('borclu')} className={`px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-[12px] font-extrabold transition ${filter === 'borclu' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 md:hover:bg-amber-100'}`}>Borçlu</button>
            <button onClick={() => setFilter('pasif')} className={`px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-[12px] font-extrabold transition ${filter === 'pasif' ? 'bg-slate-500 text-white' : 'bg-slate-100 md:hover:bg-slate-200'}`}>Pasif</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-2 md:space-y-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3 md:auto-rows-min md:content-start">
        {loading ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold md:col-span-full">Yükleniyor</div>
        ) : filtreli.length === 0 ? (
          <div className="text-center py-10 text-xs md:text-[13px] font-bold text-slate-400 md:col-span-full">Müşteri bulunamadı</div>
        ) : (
          filtreli.map((m) => {
            const paketler = aktifPaketler(m);
            const toplam = toplamBorc(m);
            return (
              <div key={m.id} onClick={() => setDetayMusteri(m)} className="bg-white p-3 md:p-4 rounded-xl border cursor-pointer hover:border-violet-400 hover:shadow-md md:hover:-translate-y-0.5 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[13px] md:text-[14px] text-slate-900">{m.adi}</span>
                      {toplam > 0 && <span className="text-[9px] md:text-[10px] font-bold rounded-full bg-rose-100 text-rose-600 px-2 py-0.5">Borçlu</span>}
                    </div>

                    <div className="text-[10px] md:text-[11px] font-bold text-slate-500 mt-0.5">{m.telefon || '-'}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => wa(m.telefon)} className="w-7 h-7 md:w-8 md:h-8 bg-emerald-50 rounded-full flex items-center justify-center md:hover:bg-emerald-100 transition" title="WhatsApp">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                    <a href={`tel:${m.telefon}`} className="w-7 h-7 md:w-8 md:h-8 bg-indigo-50 rounded-full flex items-center justify-center md:hover:bg-indigo-100 transition" title="Ara">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    {isAdmin && (
                      <button onClick={(e) => duzenleAc(m, e)} className="w-7 h-7 md:w-8 md:h-8 bg-indigo-50 rounded-full flex items-center justify-center md:hover:bg-indigo-100 transition" title="Düzenle">
                        <Edit className="w-3.5 h-3.5 text-indigo-600" />
                      </button>
                    )}
                    {/* isAdmin && (
                      <button onClick={() => sil(m.id, m.adi)} className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center" title="Sil">
                        <Trash className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )*/}
                  </div>
                </div>

                {paketler.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {paketler.map((p) => {
                      const borc = p.ucret - p.odenen_tutar;
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold whitespace-nowrap">
                              {p.kalan_seans}/{p.toplam_seans} {p.hizmetler?.adi}
                            </span>
                            {p.hizmetler?.tur === 'Grup' && (
                              <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-extrabold whitespace-nowrap">
                                Grup {grupDoluluk[p.id] || 1}/{p.hizmetler?.katilim_sayisi}
                              </span>
                            )}
                            {borc > 0 && (
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold">
                                {borc.toLocaleString('tr-TR')} TL borç
                              </span>
                            )}
                          </div>
                          {borc > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setOdeme({ paket: p, musteri: { id: m.id, adi: m.adi } }); }}
                              className="text-[10px] md:text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1 active:scale-95 md:hover:bg-emerald-100 transition"
                            >
                              <CreditCard className="w-3 h-3" /> Öde
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-2 text-[10px] md:text-[11px] text-slate-400 font-bold flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Detay için tıklayın
                </div>
              </div>
            );
          })
        )}
      </div>

      {musteriModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-6">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 md:p-6 max-h-[90dvh] md:max-h-[88vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold">Yeni Müşteri Ekle</h2>
              <button onClick={() => setMusteriModal(false)} className="md:hover:bg-slate-100 md:rounded-full md:p-1 transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={ekle} className="mt-3 space-y-3">
              <input required placeholder="Ad Soyad" value={yeniAd} onChange={(e) => setYeniAd(ilkHarfBuyuk(e.target.value))} className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm md:text-[14px]" />
              <PhoneInput required value={yeniTel} onChange={setYeniTel} />
              <button type="submit" className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl font-extrabold text-sm md:text-[14px] transition">Kaydet</button>
            </form>
          </div>
        </div>
      )}

      {duzenle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 md:p-6" onClick={() => setDuzenle(null)}>
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-2xl p-5 md:p-6 max-h-[90dvh] md:max-h-[88vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between border-b pb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold">Müşteri Düzenle</h2>
              <button onClick={() => setDuzenle(null)} className="md:hover:bg-slate-100 md:rounded-full md:p-1 transition"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={duzenleKaydet} className="mt-3 space-y-3">
              <input required placeholder="Ad Soyad" value={duzenleAd} onChange={(e) => setDuzenleAd(ilkHarfBuyuk(e.target.value))} className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 font-bold text-sm md:text-[14px]" />
              <PhoneInput required value={duzenleTel} onChange={setDuzenleTel} />
              <button type="submit" className="w-full py-3 bg-[#5b46f5] hover:bg-[#4c3ae0] text-white rounded-xl font-extrabold text-sm md:text-[14px] transition">Güncelle</button>
            </form>
          </div>
        </div>
      )}

      {odeme && (
        <OdemeModal paket={odeme.paket} musteri={odeme.musteri} onClose={() => setOdeme(null)} onSuccess={getir} />
      )}

      {detayMusteri && !detayRandevu && (
        <MusteriDetayModal
          musteri={detayMusteri}
          onClose={() => setDetayMusteri(null)}
          onRandevuClick={(r) => setDetayRandevu(r)}
          onOdemeClick={(paket) => {
            setOdeme({ paket, musteri: { id: detayMusteri.id, adi: detayMusteri.adi } });
            setDetayMusteri(null);
          }}
          onSilindi={getir}
        />
      )}

      {detayRandevu && (
        <RandevuDetailModal
          isOpen={true}
          onClose={() => { setDetayRandevu(null); setDetayMusteri(null); }}
          randevu={detayRandevu}
          egitmenler={egitmenler}
          onSuccess={() => { getir(); setDetayRandevu(null); setDetayMusteri(null); }}
        />
      )}
    </div>
  );
}
