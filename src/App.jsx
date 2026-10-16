import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import CalendarView from './CalendarView';
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Yükleniyor...</div>;
  return <div className="bg-slate-100 min-h-screen">{!session ? <Login onLoginSuccess={() => {}} /> : <CalendarView />}</div>;
}