import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import { X, Plus, Phone, MessageSquare } from './Icons.jsx';

const pad = (n) => String(n).padStart(2, '0');
const tl = (n) => parseFloat(n || 0).toLocaleString('tr-TR');

function genUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

  useEffect(() => {
    if (randevu) {
      const d = new Date(randevu.baslangic_saati);
      setTarih(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      setSaat(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
      setEgitmenId(randevu.egitmen_id);
      setDurum(randevu.durum);
      setHata(null);
      setYeniMusteriId('');
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

  const fetchGrup = async () => {
    if (!randevu?.grup_id) return setGrupRandevular([]);
    const { data } = await supabase
      .from('randevular')
      .select('id, musteri_id, durum, musteriler(adi, telefon), hizmetler(adi, tur, katilim_sayisi)')
      .eq('grup_id', randevu.grup_id)
      .neq('durum', 'iptal edildi');
    setGrupRandevular(data || []);
  };

  const fetchMusteriler = async () => {
    const { data } = await supabase.from('musteriler').select('*').order('adi');
    if (data) setMusteriler(data);
  };

  if (!isOpen || !randevu) return null;

  const isGrup = randevu.hizmetler?.tur === 'Grup' || grupRandevular[0]?.hizmetler?.tur === 'Grup';
  const kapasite = randevu.hizmetler?.katilim_sayisi || grupRandevular[0]?.hizmetler?.katilim_sayisi || 1;

  // ---- GÜNCELLE ----
  const guncelle = async () => {
    setLoading(true);
    setHata(null);
    try {
      const sureMs = new Date(randevu.bitis_saati) - new Date(randevu.baslangic_saati);
      const [y, m, d] = tarih.split('-').map(Number);
      const [sh, sm] = saat.split(':').map(Number);
      const newStart = new Date(y, m - 1, d, sh, sm, 0);
      const newEnd = new Date(newStart.getTime() + sureMs);

      // Saat / eğitmen: grupta tüm katılımcılar birlikte taşınır
      const ids = isGrup && grupRandevular.length > 0 ? grupRandevular.map((g) => g.id) : [randevu.id];
      const { error: e1 } = await supabase
        .from('randevular')
        .update({
          baslangic_saati: newStart.toISOString(),
          bitis_saati: newEnd.toISOString(),
          egitmen_id: egitmenId,
        })
        .in('id', ids);
      if (e1) throw e1;

      // Durum sadece bu müşterinin seansı için
      if (durum !== randevu.durum) {
        const { error: e2 } = await supabase.from('randevular').update({ durum }).eq('id', randevu.id);
        if (e2) throw e2;
      }

      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- SİLME (veritabanı fonksiyonu ile) ----
  const seanslariSil = async (ids, mesaj) => {
    if (!window.confirm(mesaj)) return;
    setLoading(true);
    setHata(null);
    const { data, error } = await supabase.rpc('studio_g_seanslari_sil', { p_ids: ids });
    setLoading(false);
    if (error) {
      setHata(error.message.includes('yöneticiye') ? 'Silme işlemini yalnızca yönetici yapabilir.' : error.message);
      return;
    }
    alert(
      `✅ Silindi.\n\n` +
      `• ${data.seans} seans silindi\n` +
      (data.iade > 0 ? `• ${data.iade} seans hakkı pakete iade edildi\n` : '') +
      (data.kazanc > 0 ? `• ${tl(data.kazanc)} TL eğitmen hakedişi silindi\n` : '')
    );
    onSuccess && onSuccess();
    onClose();
  };

  const notMetni =
    `\n\nNot:\n` +
    `• Sadece bu tarihteki seans silinir, diğer haftalar kalır.\n` +
    `• Tamamlanmış seans silinirse eğitmen hakedişi silinir ve hak pakete iade edilir.\n` +
    `• Paket ve ödemeler silinmez (tamamı için Müşteri kartı → Aktif Paketler → Sil).\n\n` +
    `Bu işlem geri alınamaz. Devam edilsin mi?`;

  const tekSil = () =>
    seanslariSil([randevu.id], `${randevu.musteriler?.adi || 'Müşteri'} için bu seans silinecek.` + notMetni);

  const grupSeansiSil = () =>
    seanslariSil(
      grupRandevular.map((g) => g.id),
      `Bu saatteki grup seansı TÜM katılımcılar için (${grupRandevular.length} kişi) silinecek.` + notMetni
    );

  // ---- GRUBA EKLE ----
  const grubaEkle = async () => {
    if (!yeniMusteriId) return;
    if (grupRandevular.length >= kapasite) return setHata('Kontenjan dolu!');
    if (grupRandevular.some((g) => g.musteri_id === yeniMusteriId)) return setHata('Bu müşteri zaten grupta.');
    setLoading(true);
    setHata(null);
    try {
      // Müşterinin bu hizmet için boşta hakkı olan paketi
      const { data: adaylar } = await supabase
        .from('musteri_paketleri')
        .select('id, kalan_seans')
        .eq('musteri_id', yeniMusteriId)
        .eq('hizmet_id', randevu.hizmet_id)
        .eq('durum', true)
        .gt('kalan_seans', 0)
        .order('olusturma_tarihi', { ascending: true });

      let paketId = null;
      for (const p of adaylar || []) {
        const { count } = await supabase
          .from('randevular')
          .select('id', { count: 'exact', head: true })
          .eq('paket_id', p.id)
          .eq('durum', 'planlandı');
        if (p.kalan_seans - (count || 0) >= 1) { paketId = p.id; break; }
      }
      if (!paketId) {
        throw new Error('Bu müşterinin bu ders için boşta seans hakkı yok. Önce "Yeni Randevu" ile paket oluşturun.');
      }

      const { error } = await supabase.from('randevular').insert([{
        musteri_id: yeniMusteriId,
        egitmen_id: randevu.egitmen_id,
        hizmet_id: randevu.hizmet_id,
        paket_id: paketId,
        seri_id: genUUID(),
        grup_id: randevu.grup_id,
        baslangic_saati: randevu.baslangic_saati,
        bitis_saati: randevu.bitis_saati,
        durum: 'planlandı',
      }]);
      if (error) throw error;

      setYeniMusteriId('');
      await fetchGrup();
      onSuccess && onSuccess();
    } catch (e) {
      setHata(e.message);
    } finally {
      setLoading(false);
    }
  };

  const whatsapp = (tel, ad) => {
    let c = (tel || '').replace(/\D/g, '');
    if (c.startsWith('0')) c = c.substring(1);
    if (!c.startsWith('90')) c = '90' + c;
    window.open(`https://wa.me/${c}?text=${encodeURIComponent(`Merhaba ${ad}, Studio G'den yazıyoruz.`)}`, '_blank');
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
                <div key={g.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                  <span className="font-bold text-slate-800">{g.musteriler?.adi}</span>
                  <div className="flex gap-1">
                    <a href={`tel:${g.musteriler?.telefon}`} className="w-7 h-7 bg-white border rounded-full flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => whatsapp(g.musteriler?.telefon, g.musteriler?.adi)}
                      className="w-7 h-7 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
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
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl text-left">
            <div className="font-extrabold text-[14px] text-slate-900">{randevu.musteriler?.adi}</div>
            <div className="font-bold text-slate-600">
              {randevu.hizmetler?.adi} {randevu.kullanicilar?.adi ? `• ${randevu.kullanicilar.adi}` : ''}
            </div>
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
              Tamamlandı: seans düşer, eğitmen hakedişi eklenir. İptal: seans düşer, hakediş eklenmez.
              Planlandı'ya geri alınırsa seans iade edilir.
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