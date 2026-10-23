import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Phone, MessageSquare, Calendar, Edit } from './Icons.jsx';

const saatFormatla = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const tarihFormatla = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
};

const tl = (n) => parseFloat(n || 0).toLocaleString('tr-TR');

export default function MusteriDetayModal({ musteri, onClose, onRandevuClick, onOdemeClick, onSilindi }) {
  const [randevular, setRandevular] = useState([]);
  const [paketler, setPaketler] = useState([]);
  const [grupDoluluk, setGrupDoluluk] = useState({});
  const [loading, setLoading] = useState(true);
  const [aktifTab, setAktifTab] = useState('gelecek');
  const [isAdmin, setIsAdmin] = useState(false);
  const [siliniyor, setSiliniyor] = useState(null);
  const [aktifMi, setAktifMi] = useState(musteri?.aktif !== false);
  const [aktifKayit, setAktifKayit] = useState(false);

  useEffect(() => {
    if (!musteri) return;
    setAktifMi(musteri.aktif !== false);
    verileriGetir();
  }, [musteri]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('kullanicilar').select('rol').eq('id', user.id).single();
      setIsAdmin(data?.rol === 'Admin');
    })();
  }, []);

  const verileriGetir = async () => {
    setLoading(true);

    const { data: kat } = await supabase
      .from('randevu_katilimcilari')
      .select('paket_id, randevular(id, baslangic_saati, bitis_saati, durum, egitmen_id, hizmet_id, seri_id, egitmen_ucret, hizmetler(adi, tur, katilim_sayisi), randevu_katilimcilari(id))')
      .eq('musteri_id', musteri.id);

    const { data: pkt } = await supabase
      .from('musteri_paketleri')
      .select('*, hizmetler(adi, tur, katilim_sayisi)')
      .eq('musteri_id', musteri.id)
      .order('olusturma_tarihi', { ascending: false });

    const rndList = (kat || [])
      .filter((k) => k.randevular)
      .map((k) => ({
        ...k.randevular,
        paket_id: k.paket_id,
        katilim_adet: (k.randevular.randevu_katilimcilari || []).length,
      }))
      .sort((a, b) => new Date(b.baslangic_saati) - new Date(a.baslangic_saati));
    const pktList = pkt || [];

    const doluluk = {};
    pktList.forEach((p) => {
      if (p.hizmetler?.tur !== 'Grup') return;
      const seanslar = rndList
        .filter((r) => r.paket_id === p.id)
        .sort((a, b) => new Date(a.baslangic_saati) - new Date(b.baslangic_saati));
      const siradaki = seanslar.find((r) => r.durum === 'planlandı') || seanslar[seanslar.length - 1];
      if (siradaki) doluluk[p.id] = siradaki.katilim_adet || 1;
    });

    setRandevular(rndList);
    setPaketler(pktList);
    setGrupDoluluk(doluluk);
    setLoading(false);
  };

  const aktifDegistir = async () => {
    const next = !aktifMi;
    if (!next) {
      const planli = randevular.filter((r) => r.durum === 'planlandı').length;
      if (planli > 0) {
        alert(`Aktif randevusu var (${planli} planlı seans). Pasif edilemez.`);
        return;
      }
    }
    setAktifKayit(true);
    const { error } = await supabase.from('musteriler').update({ aktif: next }).eq('id', musteri.id);
    setAktifKayit(false);
    if (error) { alert(error.message); return; }
    setAktifMi(next);
    onSilindi && onSilindi();
  };

  const paketSil = async (p) => {
    const bagliSeanslar = randevular.filter((r) => r.paket_id === p.id);
    const planlanan = bagliSeanslar.filter((r) => r.durum === 'planlandı').length;
    const tamamlanan = bagliSeanslar.filter((r) => r.durum === 'tamamlandı');
    const iptal = bagliSeanslar.filter((r) => r.durum === 'iptal edildi').length;
    const isGrup = p.hizmetler?.tur === 'Grup';

    const onay = window.confirm(
      `"${p.hizmetler?.adi || 'Paket'}" paketi KALICI olarak silinecek.\n\n` +
      `Silinecekler:\n` +
      `• Bu müşterinin seans kayıtları: ${bagliSeanslar.length} seans\n` +
      `   (${planlanan} planlı, ${tamamlanan.length} tamamlanan, ${iptal} iptal)\n` +
      `• Pakete yapılan ödemeler: ${tl(p.odenen_tutar)} TL\n` +
      (isGrup
        ? `\nℹ️ Grup: Sadece bu müşteri çıkarılır. Ders başkalarıyla duruyorsa eğitmen hakedişi silinmez.\nSon kişi ise boş ders takvimden kalkar.\n`
        : `\nℹ️ Bireysel ders ve bu paket silinir.\n`) +
      `\n⚠️ Ciro ve alacak bu ödemeler kadar düşer.\n` +
      `Bu işlem geri alınamaz. Emin misiniz?`
    );

    if (!onay) return;

    setSiliniyor(p.id);
    const { data, error } = await supabase.rpc('studio_g_paketi_sil', { p_paket_id: p.id });
    setSiliniyor(null);

    if (error) {
      const mesaj = error.message.includes('yöneticiye')
        ? 'Silme işlemini yalnızca yönetici yapabilir.'
        : error.message;
      alert('Silinemedi: ' + mesaj);
      return;
    }

    alert(
      `✅ Paket silindi.\n\n` +
      `• ${data.seans} seans kaydı silindi\n` +
      `• ${tl(data.odeme)} TL ödeme kaydı silindi`
    );
    await verileriGetir();
    onSilindi && onSilindi();
  };

  if (!musteri) return null;

  const simdi = new Date();
  const pakettePlanliVar = (paketId) =>
    randevular.some((x) => x.paket_id === paketId && x.durum === 'planlandı');

  const gelecek = randevular
    .filter((r) => {
      if (new Date(r.baslangic_saati) < simdi) return false;
      if (r.durum === 'iptal edildi') return false;
      if (r.paket_id && !pakettePlanliVar(r.paket_id)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.baslangic_saati) - new Date(b.baslangic_saati));
  const gelecekIds = new Set(gelecek.map((r) => r.id));
  const paketBitti = (paketId) => paketId && !pakettePlanliVar(paketId);
  const gecmisTum = randevular
    .filter((r) => !gelecekIds.has(r.id) && !paketBitti(r.paket_id))
    .sort((a, b) => new Date(b.baslangic_saati) - new Date(a.baslangic_saati));
  const gecmis = gecmisTum.slice(0, 20);
  const gosterilecekRandevular = aktifTab === 'gelecek' ? gelecek : gecmis;

  const aktifPaketler = paketler.filter((p) => p.durum && p.kalan_seans > 0);
  const tamamlananPaketler = paketler.filter((p) => !p.durum || p.kalan_seans <= 0);

  const paketKart = (p, tamamlandi) => {
    const borc = p.ucret - p.odenen_tutar;
    const isGrup = p.hizmetler?.tur === 'Grup';
    return (
      <div key={p.id} className={`border p-3 rounded-xl ${tamamlandi ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-[12px] text-slate-900 flex items-center gap-1.5 flex-wrap">
              {p.hizmetler?.adi || 'Hizmet'}
              {isGrup && (
                <span className="text-[10px] font-extrabold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                  Grup {grupDoluluk[p.id] || 1}/{p.hizmetler?.katilim_sayisi}
                </span>
              )}
              {tamamlandi && (
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Tamamlandı
                </span>
              )}
            </div>
            <div className="text-[10px] font-bold text-slate-600 mt-0.5">
              {tamamlandi
                ? `${p.toplam_seans} seans tamamlandı`
                : `${p.kalan_seans}/${p.toplam_seans} seans kaldı`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-extrabold text-[12px] text-slate-900">
              {tl(p.odenen_tutar)} / {tl(p.ucret)} TL
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              {borc > 0 && (
                <button
                  onClick={() => onOdemeClick && onOdemeClick(p)}
                  className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-1 rounded-full"
                >
                  {borc.toLocaleString('tr-TR')} TL Borç (Öde)
                </button>
              )}
              {/*isAdmin && (
                <button
                  onClick={() => paketSil(p)}
                  disabled={siliniyor === p.id}
                  className="text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full active:bg-rose-100 disabled:opacity-50"
                >
                  {siliniyor === p.id ? 'Siliniyor...' : 'Sil'}
                </button>
              )*/}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const durumBadge = (durum) => {
    if (durum === 'tamamlandı') return { text: 'Tamamlandı', color: 'bg-emerald-100 text-emerald-700' };
    if (durum === 'iptal edildi') return { text: 'İptal', color: 'bg-rose-100 text-rose-700' };
    return { text: 'Planlandı', color: 'bg-indigo-100 text-indigo-700' };
  };

  const wa = (tel) => {
    let c = (tel || '').replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">{musteri.adi}</h2>
            <p className="text-[11px] font-bold text-slate-500">{musteri.telefon || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={aktifDegistir}
              disabled={aktifKayit}
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border disabled:opacity-50 ${
                aktifMi
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {aktifKayit ? '...' : aktifMi ? 'Aktif' : 'Pasif'}
            </button>
            <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <a
              href={`tel:${musteri.telefon}`}
              className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" /> Ara
            </a>
            <button
              onClick={() => wa(musteri.telefon)}
              className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </div>

          {aktifPaketler.length > 0 && (
            <div>
              <h3 className="text-[12px] font-extrabold text-slate-900 mb-2 uppercase tracking-wider">Aktif Paketler</h3>
              <div className="space-y-2">{aktifPaketler.map((p) => paketKart(p, false))}</div>
            </div>
          )}

          {tamamlananPaketler.length > 0 && (
            <div>
              <h3 className="text-[12px] font-extrabold text-slate-900 mb-2 uppercase tracking-wider">
                Tamamlanan Paketler ({tamamlananPaketler.length})
              </h3>
              <div className="space-y-2">{tamamlananPaketler.map((p) => paketKart(p, true))}</div>
            </div>
          )}

          <div>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-3">
              <button
                onClick={() => setAktifTab('gelecek')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  aktifTab === 'gelecek' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                Gelecek ({gelecek.length})
              </button>
              <button
                onClick={() => setAktifTab('gecmis')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-extrabold ${
                  aktifTab === 'gecmis' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                Geçmiş ({gecmisTum.length})
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">Yükleniyor...</div>
            ) : gosterilecekRandevular.length === 0 ? (
              <div className="text-center py-10 text-xs font-bold text-slate-400">
                {aktifTab === 'gelecek' ? 'Gelecek randevu yok' : 'Geçmiş randevu yok'}
              </div>
            ) : (
              <div className="space-y-2">
                {gosterilecekRandevular.map((r) => {
                  const badge = durumBadge(r.durum);
                  const isGrup = r.hizmetler?.tur === 'Grup';
                  return (
                    <button
                      key={r.id}
                      onClick={() => onRandevuClick && onRandevuClick(r)}
                      className="w-full text-left bg-white border border-slate-200 hover:border-violet-400 hover:shadow-md transition rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-[12px] text-slate-900">
                              {tarihFormatla(r.baslangic_saati)} • {saatFormatla(r.baslangic_saati)}-{saatFormatla(r.bitis_saati)}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 truncate">
                              {r.hizmetler?.adi} {isGrup ? `• Grup ${r.katilim_adet || 1}/${r.hizmetler?.katilim_sayisi}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}