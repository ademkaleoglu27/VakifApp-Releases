"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CreateTenantForm } from '@/components/CreateTenantForm';
import { LogOut } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchTenants();
    }
  }, [session]);

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from('vakiflar')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTenants(data);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Yükleniyor...</div>;

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded bg-white p-6 shadow-md">
          <h1 className="mb-6 text-center text-xl font-bold text-slate-800">Nur Mektebi Yönetim</h1>
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700">E-Posta</label>
            <input name="email" type="email" className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700">Şifre</label>
            <input name="password" type="password" className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400" required />
          </div>
          <button className="w-full rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700">
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <header className="mb-8 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Yönetimi</h1>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/settings" className="flex items-center gap-2 rounded bg-slate-100 p-2 text-slate-600 hover:bg-slate-200">
            ⚙️ Bakım
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-2 rounded bg-red-50 p-2 text-red-600 hover:bg-red-100">
            <LogOut size={18} /> Çıkış
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Tenant Card */}
        <div className="md:col-span-1">
          <CreateTenantForm onSuccess={fetchTenants} />
        </div>

        {/* Tenant List */}
        <div className="rounded-xl bg-white p-6 shadow-sm md:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Mevcut Vakıflar ({tenants.length})</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Vakıf Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kod</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Yetkili</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      <a href={`/vakif/${t.id}`} className="block h-full w-full outline-none focus:text-indigo-600">
                        {t.name}
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{t.code}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {t.contact_email || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 font-mono">{t.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Misafir */}
        <div className="md:col-span-1">
          <div className="rounded-xl bg-orange-50 p-6 shadow-sm border border-orange-100">
            <h2 className="mb-2 text-lg font-bold text-orange-900">Misafir Takibi</h2>
            <p className="mb-4 text-xs text-orange-700">Platformda boşta duran kullanıcıları inceleyin.</p>
            <a href="/misafir" className="block w-full rounded bg-orange-600 px-4 py-2 text-center font-bold text-white hover:bg-orange-700">
              Misafirleri İncele
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
