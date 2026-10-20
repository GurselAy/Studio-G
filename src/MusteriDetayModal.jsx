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
  const [grupDoluluk, setGrupDoluluk] = useState({}); // { paket_id: kişi sayısı }
  const [loading, setLoading] = useState(true);
  const [aktifTab, setAktifTab] = useState('gelecek');
  const [isAdmin, setIsAdmin] = useState(false);
  const [siliniyor, setSiliniyor] = useState(null);

  useEffect(() => {
    if (!musteri) return;
    verileriGetir();
  }, [musteri]);

  // Giriş yapan kullanıcının rolü
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

    const { data: rnd } = await supabase
      .from('randevular')
      .select('*, hizmetler(adi, tur, katilim_sayisi), kullanicilar(adi)')
      .eq('musteri_id', musteri.id)
      .order('baslangic_saati', { ascending: false });

    const { data: pkt } = await supabase
      .from('musteri_paketleri')
      .select('*, hizmetler(adi, tur, katilim_sayisi)')
      .eq('musteri_id', musteri.id)
      .eq('durum', true)
      .order('olusturma_tarihi', { ascending: false });

    const rndList = rnd || [];
    const pktList = pkt || [];

    // Grup paketleri için sıradaki planlı seansın grup_id'si
    const paketGrup = {};
    pktList.forEach((p) => {
      if (p.hizmetler?.tur !== 'Grup') return;
      const seanslar = rndList
        .filter((r) => r.paket_id === p.id)
        .sort((a, b) => new Date(a.baslangic_saati) - new Date(b.baslangic_saati));
      const siradaki = seanslar.find((r) => r.durum === 'planlandı') || seanslar[seanslar.length - 1];
      if (siradaki?.grup_id) paketGrup[p.id] = siradaki.grup_id;
    });

    // O grup seansındaki toplam katılımcı (tüm müşteriler)
    const doluluk = {};
    const grupIdler = [...new Set(Object.values(paketGrup))];
    if (grupIdler.length > 0) {
      const { data: grupRnd } = await supabase
        .from('randevular')
        .select('grup_id')
        .in('grup_id', grupIdler)
        .neq('durum', 'iptal edildi');

      const sayac = {};
      (grupRnd || []).forEach((g) => { sayac[g.grup_id] = (sayac[g.grup_id] || 0) + 1; });
      Object.entries(paketGrup).forEach(([paketId, grupId]) => {
        doluluk[paketId] = sayac[grupId] || 1;
      });
    }

    setRandevular(rndList);
    setPaketler(pktList);
    setGrupDoluluk(doluluk);
    setLoading(false);
  };

  // ---- PAKET SİLME ----
  const paketSil = async (p) => {
    const bagliSeanslar = randevular.filter((r) => r.paket_id === p.id);
    const planlanan = bagliSeanslar.filter((r) => r.durum === 'planlandı').length;
    const tamamlanan = bagliSeanslar.filter((r) => r.durum === 'tamamlandı');
    const iptal = bagliSeanslar.filter((r) => r.durum === 'iptal edildi').length;
    const hakedis = tamamlanan.reduce((t, r) => t + parseFloat(r.egitmen_ucret || 0), 0);
    const isGrup = p.hizmetler?.tur === 'Grup';

    const onay = window.confirm(
      `"${p.hizmetler?.adi || 'Paket'}" paketi KALICI olarak silinecek.\n\n` +
      `Silinecekler:\n` +
      `• Randevu ve bağlı tüm seanslar: ${bagliSeanslar.length} seans\n` +
      `   (${planlanan} planlı, ${tamamlanan.length} tamamlanan, ${iptal} iptal)\n` +
      `• Pakete yapılan ödemeler: ${tl(p.odenen_tutar)} TL\n` +
      `• Eğitmen hakedişleri: ${tl(hakedis)} TL\n` +
      (isGrup ? `\nℹ️ Grup dersi: Sadece bu müşteri gruptan çıkarılır, diğer katılımcılar etkilenmez.\n` : '') +
      `\n⚠️ Ciro, hakediş ve kar/zarar raporları bu tutarlar kadar düşecek.\n` +
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
      `• ${data.seans} seans silindi\n` +
      `• ${tl(data.odeme)} TL ödeme kaydı silindi\n` +
      `• ${tl(data.kazanc)} TL eğitmen hakedişi silindi`
    );
    await verileriGetir();
    onSilindi && onSilindi();
  };

  if (!musteri) return null;

  const simdi = new Date();
  const gelecek = randevular
    .filter((r) => new Date(r.baslangic_saati) >= simdi && r.durum !== 'iptal edildi')
    .sort((a, b) => new Date(a.baslangic_saati) - new Date(b.baslangic_saati));
  const gecmisTum = randevular
    .filter((r) => new Date(r.baslangic_saati) < simdi || r.durum === 'iptal edildi')
    .sort((a, b) => new Date(b.baslangic_saati) - new Date(a.baslangic_saati));
  const gecmis = gecmisTum.slice(0, 20);
  const gosterilecekRandevular = aktifTab === 'gelecek' ? gelecek : gecmis;

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
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Hızlı eylemler */}
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

          {/* Aktif Paketler */}
          {paketler.length > 0 && (
            <div>
              <h3 className="text-[12px] font-extrabold text-slate-900 mb-2 uppercase tracking-wider">Aktif Paketler</h3>
              <div className="space-y-2">
                {paketler.map((p) => {
                  const borc = p.ucret - p.odenen_tutar;
                  const isGrup = p.hizmetler?.tur === 'Grup';
                  return (
                    <div key={p.id} className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-[12px] text-slate-900 flex items-center gap-1.5 flex-wrap">
                            {p.hizmetler?.adi || 'Hizmet'}
                            {isGrup && (
                              <span className="text-[10px] font-extrabold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                                Grup {grupDoluluk[p.id] || 1}/{p.hizmetler?.katilim_sayisi}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                            {p.kalan_seans}/{p.toplam_seans} seans kaldı
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
                            {isAdmin && (
                              <button
                                onClick={() => paketSil(p)}
                                disabled={siliniyor === p.id}
                                className="text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-full active:bg-rose-100 disabled:opacity-50"
                              >
                                {siliniyor === p.id ? 'Siliniyor...' : 'Sil'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seanslar - Tabs (sil butonu YOK) */}
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
                              {r.hizmetler?.adi} {isGrup ? `• Grup ${r.hizmetler?.katilim_sayisi} kişi` : ''} • {r.kullanicilar?.adi?.split(' ')[0]}
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