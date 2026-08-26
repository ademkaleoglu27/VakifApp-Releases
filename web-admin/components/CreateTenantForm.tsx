"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PlusCircle, Loader2 } from 'lucide-react';

export function CreateTenantForm({ onSuccess }: { onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { data, error } = await supabase.rpc('create_tenant_rpc', {
                p_name: name,
                p_code: code,
                p_admin_email: adminEmail
            });

            if (error) throw error;

            if (!data.success) {
                throw new Error(data.message);
            }

            setMessage({ type: 'success', text: `Vakıf başarıyla oluşturuldu! ID: ${data.vakif_id}` });
            setName('');
            setCode('');
            setAdminEmail('');
            if (onSuccess) onSuccess();

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Bir hata oluştu.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                <PlusCircle size={20} className="text-emerald-600" />
                Yeni Vakıf Ekle
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">Vakıf Adı</label>
                    <input
                        type="text"
                        className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                        placeholder="Örn: Bursa Medresesi"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">Vakıf Kodu</label>
                    <input
                        type="text"
                        className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                        placeholder="Örn: BURSA16"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        required
                    />
                    <p className="mt-1 text-xs text-slate-400">Üyeler bu kodu girerek kayıt olacaklar.</p>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-600">Yönetici E-Postası (Opsiyonel)</label>
                    <input
                        type="email"
                        className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                        placeholder="yonetici@ornek.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-400">Bu kişi otomatik olarak yönetici yapılacak.</p>
                </div>

                {message && (
                    <div className={`rounded p-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    disabled={loading}
                    className="flex items-center justify-center gap-2 rounded bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Oluştur'}
                </button>
            </form>
        </div>
    );
}
