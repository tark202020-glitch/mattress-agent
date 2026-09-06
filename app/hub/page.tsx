'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import Image from 'next/image';
import anssilLogo from '../../resource/ANSSil_logo_final_B.png';

const MENU_ITEMS = [
    {
        id: 'builder',
        title: '매트리스 견적서 / 개발요청서 만들기',
        subtitle: '사양 선택부터 견적 산출, 개발요청서 생성까지',
        icon: '📋',
        gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        href: '/builder',
        features: ['사이즈 & 구조 선택', '단가 관리 & 견적 산출', '개발요청서 PDF 생성'],
    },
    {
        id: 'designer',
        title: '매트리스 디자인 / 분해도 만들기',
        subtitle: 'AI 커버 이미지 생성과 3D 분해도 뷰어',
        icon: '🎨',
        gradient: 'linear-gradient(135deg, #059669, #0d9488)',
        href: '/designer',
        features: ['AI 커버 이미지 생성', '3D 분해도(Exploded View)', '구조별 레이어 시각화'],
    },
    {
        id: 'bom',
        title: 'BOM / 개발관리',
        subtitle: '상품별 부품 구성·협력사·단가 관리',
        icon: '🧩',
        gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        href: '/bom/products',
        features: ['위자드 결과를 BOM으로 저장', '품목·협력사·AVL 단가 관리', '엑셀 템플릿 가져오기/내보내기'],
    },
];

export default function HubPage() {
    const router = useRouter();
    const supabase = createClient();
    const [mounted, setMounted] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (!mounted) return null;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#e8edf2',
            fontFamily: "'Inter','Pretendard',-apple-system,system-ui,sans-serif",
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 32px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Image src={anssilLogo} alt="ANSSil Logo" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>ANSSil String Mattress Agent</span>
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: 'rgba(79,70,229,0.06)', color: '#4f46e5',
                        border: '1px solid rgba(79,70,229,0.12)',
                    }}>ALPHA</span>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{
                        fontSize: 12, fontWeight: 600, padding: '8px 18px', borderRadius: 20,
                        background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                >
                    로그아웃
                </button>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 32px',
                gap: 48,
            }}>
                {/* Title */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: 36, fontWeight: 800, color: '#0f172a', marginBottom: 12,
                        letterSpacing: '-0.02em',
                    }}>
                        무엇을 만드시겠습니까?
                    </h1>
                    <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6 }}>
                        원하는 작업을 선택하세요
                    </p>
                </div>

                {/* Cards */}
                <div style={{
                    display: 'flex',
                    gap: 28,
                    maxWidth: 1240,
                    width: '100%',
                }}>
                    {MENU_ITEMS.map(item => {
                        const isHovered = hoveredId === item.id;
                        return (
                            <div
                                key={item.id}
                                onClick={() => router.push(item.href)}
                                onMouseEnter={() => setHoveredId(item.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    flex: 1,
                                    background: '#ffffff',
                                    borderRadius: 20,
                                    padding: 0,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
                                    boxShadow: isHovered
                                        ? '0 20px 60px rgba(0,0,0,0.12), 0 4px 20px rgba(0,0,0,0.06)'
                                        : '0 4px 24px rgba(0,0,0,0.06)',
                                    border: `1px solid ${isHovered ? 'rgba(79,70,229,0.2)' : '#e2e8f0'}`,
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Gradient Top Bar */}
                                <div style={{
                                    height: 6,
                                    background: item.gradient,
                                    transition: 'height 0.3s',
                                }} />

                                <div style={{ padding: '32px 28px' }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: 64, height: 64, borderRadius: 16,
                                        background: item.gradient,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, marginBottom: 20,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }}>
                                        {item.icon}
                                    </div>

                                    {/* Title */}
                                    <h2 style={{
                                        fontSize: 20, fontWeight: 800, color: '#0f172a',
                                        marginBottom: 8, lineHeight: 1.3,
                                    }}>
                                        {item.title}
                                    </h2>

                                    {/* Subtitle */}
                                    <p style={{
                                        fontSize: 14, color: '#64748b', marginBottom: 24,
                                        lineHeight: 1.5,
                                    }}>
                                        {item.subtitle}
                                    </p>

                                    {/* Features */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {item.features.map((feat, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                fontSize: 13, color: '#475569',
                                            }}>
                                                <span style={{
                                                    width: 20, height: 20, borderRadius: 6,
                                                    background: 'rgba(79,70,229,0.08)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, color: '#4f46e5', fontWeight: 700, flexShrink: 0,
                                                }}>✓</span>
                                                {feat}
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA Button */}
                                    <div style={{
                                        marginTop: 28,
                                        padding: '12px 0',
                                        textAlign: 'center',
                                        borderRadius: 12,
                                        background: isHovered ? item.gradient : 'rgba(79,70,229,0.06)',
                                        color: isHovered ? '#fff' : '#4f46e5',
                                        fontSize: 14, fontWeight: 700,
                                        transition: 'all 0.3s',
                                    }}>
                                        시작하기 →
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
