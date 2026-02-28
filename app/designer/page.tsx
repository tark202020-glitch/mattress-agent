'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { useDesignStore } from '../lib/store';
import Image from 'next/image';
import anssilLogo from '../../resource/ANSSil_logo_final_B.png';
import StepSize from '../components/steps/StepSize';
import StepFoam from '../components/steps/StepFoam';
import StepCore from '../components/steps/StepCore';
import StepCover from '../components/steps/StepCover';
import MattressExplodedView from '../components/MattressExplodedView';
import { useAutoInitTextures } from '../lib/autoInitTextures';
import ConceptImageGeneratorModal from '../components/ConceptImageGeneratorModal';

/* ══════════ 디자이너 전용 스텝 ══════════ */
const DESIGNER_STEPS = [
    { id: 1, title: '구조 선택', icon: '🛡️', description: '매트리스 폼의 레이어 구조를 선택하세요' },
    { id: 2, title: '스트링', icon: '🔧', description: '스트링 타입을 선택하세요' },
    { id: 3, title: '커버', icon: '🎨', description: '외부 커버 디자인을 선택하세요' },
    { id: 4, title: '분해도 그리기', icon: '🔍', description: '매트리스 내부 구조를 3D 분해도로 확인하세요' },
] as const;

const GAP = 12;
const PAD = 20;
const SIDEBAR_W = 520;

export default function DesignerPage() {
    const store = useDesignStore();
    const [mounted, setMounted] = useState(false);
    const [designerStep, setDesignerStep] = useState(1);
    const [showConceptModal, setShowConceptModal] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => { setMounted(true); }, []);

    // 앱 시작 시 프리셋 커버 텍스처 자동 크롭 초기화
    useAutoInitTextures();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const stepInfo = DESIGNER_STEPS.find(s => s.id === designerStep) || DESIGNER_STEPS[0];

    const renderStepContent = (stepId: number) => {
        switch (stepId) {
            case 1: return <StepFoam />;
            case 2: return <StepCore />;
            case 3: return <StepCover />;
            case 4: return null; // 분해도는 메인 영역에 표시
            default: return <div>Unknown Step</div>;
        }
    };

    if (!mounted) return null;

    const isExplodedStep = designerStep === 4;
    const hasAiImage = !!(store.customCoverImages && store.customCoverImages[store.coverId || '']);

    const mainContent = (
        <div style={{
            height: '100vh',
            padding: GAP,
            boxSizing: 'border-box',
            background: '#e8edf2',
            fontFamily: "'Inter','Pretendard',-apple-system,system-ui,sans-serif",
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: '#ffffff',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                border: '1px solid #e2e8f0',
            }}>

                {/* ════════ Header ════════ */}
                <header style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff',
                    flexShrink: 0,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: 56,
                        padding: `0 ${PAD}px`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                                onClick={() => router.push('/hub')}
                                style={{
                                    fontSize: 14, padding: '4px 12px', borderRadius: 8,
                                    background: 'transparent', border: '1px solid #e2e8f0',
                                    cursor: 'pointer', color: '#64748b', fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >← 홈</button>
                            <Image src={anssilLogo} alt="ANSSil Logo" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>매트리스 디자인 / 분해도</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                background: 'rgba(5,150,105,0.06)', color: '#059669',
                                border: '1px solid rgba(5,150,105,0.12)',
                            }}>DESIGNER</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                                fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                                background: 'rgba(5,150,105,0.06)', color: '#059669',
                            }}>Step {designerStep} / {DESIGNER_STEPS.length}</span>
                            <button
                                onClick={handleSignOut}
                                style={{
                                    fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                                    background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                            >로그아웃</button>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div style={{
                        borderTop: '1px solid #e2e8f0',
                        background: '#fafbfc',
                        display: 'flex',
                        padding: '0 8px',
                    }}>
                        {DESIGNER_STEPS.map((step) => {
                            const isActive = designerStep === step.id;
                            const isDone = designerStep > step.id;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setDesignerStep(step.id)}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        padding: '12px 8px',
                                        border: 'none',
                                        borderBottom: isActive ? '2px solid #059669' : '2px solid transparent',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        color: isActive ? '#059669' : isDone ? '#10b981' : '#94a3b8',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: 13,
                                    }}
                                >
                                    <span style={{ fontSize: 16 }}>{isDone ? '✅' : step.icon}</span>
                                    {step.title}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* ════════ Body ════════ */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Step Content (옵션 선택 화면) */}
                    {!isExplodedStep && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#fafbfc',
                        }}>
                            <div style={{
                                padding: `${PAD}px ${PAD}px 12px ${PAD}px`,
                                flexShrink: 0,
                            }}>
                                <h2 style={{
                                    fontSize: 22, fontWeight: 800, marginBottom: 4,
                                    background: 'linear-gradient(135deg, #059669, #0d9488)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}>{stepInfo.title}</h2>
                                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                                    {stepInfo.description}
                                </p>
                            </div>

                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: `0 ${PAD}px 24px ${PAD}px`,
                                display: 'flex',
                                justifyContent: 'center',
                            }}>
                                <div style={{ width: '100%', maxWidth: 1400 }}>
                                    <div className="animate-in" key={designerStep}>
                                        {renderStepContent(designerStep)}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: `16px ${PAD}px`,
                                borderTop: '1px solid #e2e8f0',
                                background: '#ffffff',
                                flexShrink: 0,
                                display: 'flex',
                                justifyContent: 'center',
                            }}>
                                <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 1400 }}>
                                    <button
                                        onClick={() => setDesignerStep(Math.max(1, designerStep - 1))}
                                        disabled={designerStep === 1}
                                        className="btn-secondary"
                                        style={{ flex: 1, opacity: designerStep === 1 ? 0.5 : 1, padding: '16px', fontSize: 16 }}
                                    >이전</button>
                                    <button
                                        onClick={() => {
                                            if (designerStep === DESIGNER_STEPS.length - 1) {
                                                if (hasAiImage) setShowConceptModal(true);
                                            } else {
                                                setDesignerStep(Math.min(DESIGNER_STEPS.length, designerStep + 1));
                                            }
                                        }}
                                        className="btn-primary"
                                        disabled={designerStep === DESIGNER_STEPS.length - 1 && !hasAiImage}
                                        style={{
                                            flex: 3, padding: '16px', fontSize: 16,
                                            opacity: (designerStep === DESIGNER_STEPS.length - 1 && !hasAiImage) ? 0.5 : 1,
                                            cursor: (designerStep === DESIGNER_STEPS.length - 1 && !hasAiImage) ? 'not-allowed' : 'pointer',
                                        }}
                                    >{designerStep === DESIGNER_STEPS.length - 1
                                        ? (hasAiImage ? '컨셉이미지 생성' : '컨셉이미지 생성 (AI 이미지 필요)')
                                        : '다음 단계'
                                        }</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Exploded View */}
                    {isExplodedStep && (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#f8fafc',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '12px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button
                                        onClick={() => setDesignerStep(3)} // 커버 스텝은 3번
                                        className="btn-secondary"
                                        style={{ fontSize: 13, padding: '6px 14px' }}
                                    >← 커버 선택으로</button>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                        🔍 매트리스 3D 분해도
                                    </span>
                                </div>
                            </div>
                            <div style={{ flex: 1, padding: 16 }}>
                                <MattressExplodedView className="w-full h-full" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {mainContent}
            <ConceptImageGeneratorModal
                isOpen={showConceptModal}
                onClose={() => setShowConceptModal(false)}
                aiCoverImageUrl={store.customCoverImages?.[store.coverId || ''] || undefined}
            />
        </>
    );
}


