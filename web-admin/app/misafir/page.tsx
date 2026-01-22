"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function MisafirStats() {
    const [stats, setStats] = useState<{ count: number; users: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const { data, error } = await supabase.rpc('get_misafir_stats_rpc');

        if (error) {
            alert('Error fetching stats: ' + error.message);
        } else {
            if (data.success) {
                setStats(data);
            } else {
                alert('Failed: ' + data.message);
            }
        }
        setLoading(false);
    };

    if (loading) return <div className="p-10 font-bold text-slate-500">Yükleniyor...</div>;

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <Link href="/" className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800">
                <ArrowLeft size={20} /> Geri Dön
            </Link>

            <header className="mb-8 flex items-center justify-between rounded-xl bg-orange-50 p-6 shadow-sm border border-orange-100">
                <div>
                    <h1 className="text-2xl font-bold text-orange-900">Misafir İstatistikleri</h1>
                    <p className="text-sm text-orange-700">Platforma kayıt olmuş ancak henüz bir vakfa atanmamış kullanıcılar.</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-orange-600">{stats?.count || 0}</div>
                    <div className="text-xs font-bold uppercase text-orange-400">Toplam Misafir</div>
                </div>
            </header>

            <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Users size={20} /> Son Kayıtlar (İlk 100)
                </h2>
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">E-Posta</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">İsim</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kayıt Tarihi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {stats?.users.map((u: any, i: number) => (
                                <tr key={i}>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{u.email}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{u.name || '-'}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 font-mono">
                                        {new Date(u.joined_at).toLocaleDateString()} {new Date(u.joined_at).toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                            {stats?.users.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500">Misafir kullanıcısı bulunmuyor.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
