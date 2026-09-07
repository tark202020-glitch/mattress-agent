'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import anssilLogo from '../../resource/ANSSil_logo_final_B.png';
import { C, FONT } from './_components/ui';

const TABS = [
    { href: '/bom/products', label: '상품 / BOM' },
    { href: '/bom/items', label: '품목' },
    { href: '/bom/avl', label: 'AVL(협력사·단가)' },
    { href: '/bom/vendors', label: '협력사' },
    { href: '/bom/employees', label: '담당자' },
    { href: '/bom/import', label: '엑셀' },
];

export default function BomLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const signOut = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh(); };
    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
            <header style={{ background: '#fff', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => router.push('/hub')} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: 'rgba(79,70,229,0.08)', color: C.primary, border: '1px solid rgba(79,70,229,0.15)', cursor: 'pointer' }}>🏠 홈</button>
                        <Image src={anssilLogo} alt="ANSSil" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>BOM / 개발관리</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(5,150,105,0.06)', color: C.green, border: '1px solid rgba(5,150,105,0.12)' }}>1차</span>
                    </div>
                    <button onClick={signOut} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>로그아웃</button>
                </div>
                <nav style={{ display: 'flex', gap: 4, padding: '0 32px', borderTop: `1px solid #f1f5f9` }}>
                    {TABS.map(t => {
                        const active = pathname === t.href || pathname.startsWith(t.href + '/');
                        return <Link key={t.href} href={t.href} style={{ padding: '10px 14px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.primary : C.sub, borderBottom: active ? `3px solid ${C.primary}` : '3px solid transparent', textDecoration: 'none' }}>{t.label}</Link>;
                    })}
                </nav>
            </header>
            <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>{children}</main>
        </div>
    );
}
