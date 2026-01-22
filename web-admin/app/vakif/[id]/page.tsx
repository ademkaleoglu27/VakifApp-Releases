"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function VakifDetails() {
    const params = useParams();
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    // Form State
    const [adminEmail, setAdminEmail] = useState('');

    useEffect(() => {
        fetchMembers();
    }, [params.id]);

    const fetchMembers = async () => {
        const { data, error } = await supabase.rpc('get_vakif_members_rpc', {
            p_vakif_id: params.id,
        });

        if (error) {
            alert('Error fetching members: ' + error.message);
        } else {
            // The RPC returns { success: true, data: [...] }
            if (data.success) {
                setMembers(data.data);
            } else {
                alert('Failed: ' + data.message);
            }
        }
        setLoading(false);
    };

    const handleAssignAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm(`${adminEmail} kullanıcısını bu vakfın YÖNETİCİSİ yapmak istediğinize emin misiniz?`)) return;

        setAssigning(true);
        const { data, error } = await supabase.rpc('assign_admin_rpc', {
            p_vakif_id: params.id,
            p_email: adminEmail,
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            if (data.success) {
                alert('Başarılı: ' + data.message);
                setAdminEmail('');
                fetchMembers(); // Refresh list to see role update
            } else {
                alert('Hata: ' + data.message);
            }
        }
        setAssigning(false);
    };

    if (loading) return <div className="p-10 font-bold text-slate-500">Yükleniyor...</div>;

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <Link href="/" className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800">
                <ArrowLeft size={20} /> Geri Dön
            </Link>

            <header className="mb-8 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Vakıf Detayları</h1>
                    <p className="text-sm font-mono text-slate-400">ID: {params.id}</p>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Helper Actions / Admin Assign */}
                <div className="md:col-span-1">
                    <div className="rounded-xl bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Shield size={20} className="text-indigo-600" /> Yönetici Ata
                        </h2>
                        <p className="mb-4 text-sm text-slate-500">
                            Bu vakıf için sorumlu bir yönetici (Mesveret Admin) atayın. Kullanıcının sistemde kayıtlı olması gerekir.
                        </p>
                        <form onSubmit={handleAssignAdmin}>
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase text-slate-500">Yönetici E-Posta</label>
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="ornek@email.com"
                                    required
                                />
                            </div>
                            <button
                                disabled={assigning}
                                className="flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {assigning ? 'Atanıyor...' : 'Yetki Ver'} <UserPlus size={18} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Members List */}
                <div className="rounded-xl bg-white p-6 shadow-sm md:col-span-2">
                    <h2 className="mb-4 text-lg font-bold text-slate-800">Üye Listesi ({members.length})</h2>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full min-w-full divide-y divide-gray-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">İsim</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rol</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {members.map((m) => (
                                    <tr key={m.id}>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{m.name || 'İsimsiz'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span
                                                className={`rounded px-2 py-1 text-xs font-bold ${m.role === 'mesveret_admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {m.role || 'Member'}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{m.email}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                            <button
                                                onClick={async () => {
                                                    if (!confirm(`${m.name || m.email} kullanıcısını vakıftan çıkarmak istediğinize emin misiniz?`)) return;
                                                    const { data, error } = await supabase.rpc('remove_vakif_member_rpc', {
                                                        p_vakif_id: params.id,
                                                        p_user_id: m.id
                                                    });
                                                    if (error || !data.success) {
                                                        alert('Hata: ' + (error?.message || data?.message));
                                                    } else {
                                                        fetchMembers();
                                                    }
                                                }}
                                                className="rounded bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                                title="Vakıftan Çıkar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {members.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">Üye bulunamadı.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="md:col-span-1">
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                    <h2 className="mb-2 text-lg font-bold text-red-700">Tehlikeli Bölge</h2>
                    <p className="mb-4 text-xs text-red-600">
                        Bu vakfı ve tüm üyelik bağlantılarını siler. Üyeler silinmez, "boşa" düşer.
                    </p>
                    <button
                        onClick={async () => {
                            if (prompt('Vakfı silmek için "SIL" yazın:') !== 'SIL') return;
                            const { data, error } = await supabase.rpc('delete_tenant_rpc', { p_vakif_id: params.id });
                            if (error || !data.success) {
                                alert('Hata: ' + (error?.message || data?.message));
                            } else {
                                alert('Vakıf silindi.');
                                router.push('/');
                            }
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                    >
                        <Trash2 size={16} /> Vakfı Sil
                    </button>
                </div>
            </div>
        </main>
    );
}
