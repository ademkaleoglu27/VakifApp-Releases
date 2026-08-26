"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [confirmCode, setConfirmCode] = useState('');

    const handleReset = async () => {
        if (confirmCode !== 'SIFIRLA') {
            alert('Lütfen onay kodunu doğru giriniz: SIFIRLA');
            return;
        }

        if (!confirm('DİKKAT! Tüm okuma kayıtları, hatimler ve istatistikler silinecek. Bu işlem geri alınamaz. Emin misiniz?')) {
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.rpc('reset_platform_stats_rpc', {
            p_confirm: 'SIFIRLA'
        });

        if (error) {
            alert('Hata: ' + error.message);
        } else {
            if (data.success) {
                alert('BAŞARILI: ' + data.message);
                setConfirmCode('');
            } else {
                alert('İşlem Başarısız: ' + data.message);
            }
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <Link href="/" className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800">
                <ArrowLeft size={20} /> Ana Ekrana Dön
            </Link>

            <header className="mb-8 rounded-xl bg-white p-6 shadow-sm">
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                    <RefreshCw className="text-slate-400" /> Sistem Bakımı
                </h1>
                <p className="text-slate-500">Veri temizliği ve sistem sıfırlama araçları.</p>
            </header>

            <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-red-700">
                    <AlertTriangle size={24} /> Sezon Sıfırlama (Factory Reset)
                </h2>
                <p className="mb-6 text-red-600">
                    Bu işlem <strong>Vakıfları ve Kullanıcıları SİLMEZ</strong>. <br />
                    Sadece okuma kayıtlarını, hatim parçalarını ve puanları sıfırlar. <br />
                    Yeni bir döneme veya teste başlamadan önce kullanılır.
                </p>

                <div className="max-w-md rounded-lg bg-white p-6 shadow-sm">
                    <label className="mb-2 block text-sm font-bold text-slate-700">Onay Kodu</label>
                    <input
                        type="text"
                        className="mb-4 w-full rounded border border-slate-300 p-2 text-sm placeholder:text-slate-400"
                        placeholder="Onaylamak için 'SIFIRLA' yazın"
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value)}
                    />

                    <button
                        onClick={handleReset}
                        disabled={loading || confirmCode !== 'SIFIRLA'}
                        className="flex w-full items-center justify-center gap-2 rounded bg-red-600 py-3 font-bold text-white hover:bg-red-700 disabled:bg-red-300"
                    >
                        {loading ? 'Temizleniyor...' : 'VERİLERİ TEMİZLE'} <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </main>
    );
}
