import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import Login from './Login.jsx';
import CalendarView from './CalendarView.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-bold">
        Yükleniyor...
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <CalendarView key={session.user.id} />
    </div>
  );
}