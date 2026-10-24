import { useEffect, useState } from 'react';

/* Ekran en az 768px mi? (Tailwind "md" ile aynı eşik)
   Telefon: false → mobil görünüm
   PC / yatay tablet: true → masaüstü görünüm
   Kullanım: const masaustu = useMasaustu();
*/
export function useMasaustu() {
  const [masaustu, setMasaustu] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false)
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const dinle = (e) => setMasaustu(e.matches);
    setMasaustu(mq.matches);
    mq.addEventListener('change', dinle);
    return () => mq.removeEventListener('change', dinle);
  }, []);

  return masaustu;
}

export default useMasaustu;
