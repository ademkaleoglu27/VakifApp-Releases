"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Shield, Trash2, Settings2 } from 'lucide-react';
import Link from 'next/link';

// Feature key → Türkçe etiket ve icon mapping
const FEATURE_MODULES = [
    { key: 'ai_assistant', label: '🤖 AI Asistan', desc: 'Gemini tabanlı sohbet asistanı' },
    { key: 'mesveret', label: '📋 Meşveret', desc: 'Kararlar ve heyet yönetimi' },
    { key: 'muhasebe', label: '💰 Muhasebe', desc: 'Gelir/gider takibi' },
    { key: 'education', label: '📖 Eğitim', desc: 'Elif-Ba ve eğitim modülleri' },
    { key: 'okuma_takibi', label: '📊 Okuma Takibi', desc: 'Liderlik tablosu ve istatistikler' },
    { key: 'duyurular', label: '🔔 Duyurular', desc: 'Vakıf duyuru sistemi' },
    { key: 'nobet_yonetimi', label: '⏰ Nöbet Yönetimi', desc: 'Nöbet listeleri ve atamaları' },
    { key: 'gorevlendirmeler', label: '✅ Görevlendirmeler', desc: 'Görev dağıtım sistemi' },
    { key: 'kutüphane', label: '📚 Kütüphane', desc: 'Risale-i Nur kütüphanesi' },
];

export default function VakifDetails() {
    const params = useParams();
    const router = useRouter();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);

    // Feature Flags State
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

    // Form State
    const [adminEmail, setAdminEmail] = useState('');

    useEffect(() => {
        fetchMembers();
        fetchFeatures();
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

    const fetchFeatures = async () => {
        const { data, error } = await supabase.rpc('get_vakif_features_rpc', {
            p_vakif_id: params.id,
        });

        if (error) {
            console.error('Feature fetch error:', error);
            // Fallback: tüm modüller açık varsay
            const defaults: Record<string, boolean> = {};
            FEATURE_MODULES.forEach(m => defaults[m.key] = true);
            setFeatures(defaults);
        } else {
            // RPC returns a JSONB object like { ai_assistant: true, mesveret: false, ... }
            const flags: Record<string, boolean> = {};
            FEATURE_MODULES.forEach(m => {
                flags[m.key] = data?.[m.key] ?? true; // Varsayılan açık
            });
            setFeatures(flags);
        }
    };

    const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
        const newEnabled = !currentEnabled;

        // Risk mitigasyonu: Kapatma öncesi onay dialogu
        if (!newEnabled) {
            const module = FEATURE_MODULES.find(m => m.key === featureKey);
            if (!confirm(`"${module?.label || featureKey}" modülünü bu vakıf için KAPATMAK istediğinize emin misiniz?\n\nBu modül vakıf üyelerinin menüsünden kaldırılacaktır.`)) {
                return;
            }
        }

        setTogglingFeature(featureKey);

        const { data, error } = await supabase.rpc('upsert_vakif_feature_rpc', {
            p_vakif_id: params.id,
            p_feature_key: featureKey,
            p_enabled: newEnabled,
        });

        if (error) {
            alert('Hata: ' + error.message);
        } else if (!data.success) {
            alert('İşlem başarısız: ' + data.message);
        } else {
            // Optimistic update
            setFeatures(prev => ({ ...prev, [featureKey]: newEnabled }));
        }

        setTogglingFeature(null);
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
                <div className="md:col-span-1 flex flex-col gap-6">
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

                    {/* Modül Yönetimi (Feature Toggles) */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                        <h2 className="mb-2 text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Settings2 size={20} className="text-violet-600" /> Modül Yönetimi
                        </h2>
                        <p className="mb-4 text-xs text-slate-400">
                            Bu vakıf için hangi modüllerin mobil uygulamada görüneceğini kontrol edin.
                        </p>

                        <div className="flex flex-col gap-1">
                            {FEATURE_MODULES.map((mod) => {
                                const enabled = features[mod.key] ?? true;
                                const isToggling = togglingFeature === mod.key;

                                return (
                                    <div
                                        key={mod.key}
                                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${enabled ? 'bg-white hover:bg-slate-50' : 'bg-red-50'
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="text-sm font-semibold text-slate-700">{mod.label}</div>
                                            <div className="text-xs text-slate-400 truncate">{mod.desc}</div>
                                        </div>

                                        <button
                                            onClick={() => toggleFeature(mod.key, enabled)}
                                            disabled={isToggling}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-gray-300'
                                                }`}
                                            role="switch"
                                            aria-checked={enabled}
                                            aria-label={`${mod.label} toggle`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
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
