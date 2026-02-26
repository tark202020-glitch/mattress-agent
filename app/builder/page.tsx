'use client';

import DevelopmentRequestModal from '../components/DevelopmentRequestModal';
import PricingManageModal from '../components/PricingManageModal';
import CompletionModal from '../components/CompletionModal';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { useDesignStore } from '../lib/store';
import { WIZARD_STEPS, SIDEBAR_W } from '../lib/constants';
import StepIndicator from '../components/StepIndicator';
import StepSize from '../components/steps/StepSize';
import StepFoam from '../components/steps/StepFoam';
import StepCore from '../components/steps/StepCore';
import StepCover from '../components/steps/StepCover';
import { StepGenericSelect } from '../components/steps/StepGenericSelect';
import MattressDrawing from '../components/MattressDrawing';
import Mattress3D from '../components/Mattress3D';
import SpecSummary from '../components/SpecSummary';
import PresetPanel from '../components/PresetPanel';
import Image from 'next/image';
import anssilLogo from '../../resource/ANSSil_logo_final_B.png';


/* ══════════ 통일 여백 상수 ══════════ */
const GAP = 12;          // 외곽 여백
const PAD = 20;          // 내부 콘텐츠 여백

export default function Page() {
    const { currentStep, nextStep, prevStep } = useDesignStore();
    const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
    const [mounted, setMounted] = useState(false);
    const [isDevRequestOpen, setIsDevRequestOpen] = useState(false);
    const [isCompletionOpen, setIsCompletionOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => { setMounted(true); }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const renderStepContent = (stepId: number) => {
        switch (stepId) {
            case 1: return <StepSize />;
            case 2: return <StepFoam />;
            case 3: return <StepCore />;
            case 4: return <StepCover />;
            case 5: return <StepGenericSelect stepKey="controller" />;
            case 6: return <StepGenericSelect stepKey="packaging" />;
            case 7: return <StepGenericSelect stepKey="delivery" />;
            default: return <div>Unknown Step</div>;
        }
    };

    const stepInfo = WIZARD_STEPS.find(s => s.id === currentStep) || WIZARD_STEPS[0];

    if (!mounted) return null;

    return (
        /* ── 최외곽: 화면 전체 배경 + 내부 여백 ── */
        <div style={{
            height: '100vh',
            padding: GAP,
            boxSizing: 'border-box',
            background: '#e8edf2',
            fontFamily: "'Inter','Pretendard',-apple-system,system-ui,sans-serif",
        }}>
            {/* ── 메인 컨테이너: 둥근 모서리 카드 ── */}
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
                    {/* Top Row */}
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
                                    fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20,
                                    background: 'rgba(79,70,229,0.08)', color: '#4f46e5',
                                    border: '1px solid rgba(79,70,229,0.15)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.08)'; }}
                            >🏠 홈</button>
                            <Image src={anssilLogo} alt="ANSSil Logo" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                            <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>ANSSil String Mattress Agent</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                background: 'rgba(79,70,229,0.06)', color: '#4f46e5',
                                border: '1px solid rgba(79,70,229,0.12)',
                            }}>ALPHA V1.037</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <PresetPanel />
                            <button
                                onClick={() => setIsPricingOpen(true)}
                                style={{
                                    fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20,
                                    background: 'rgba(5,150,105,0.08)', color: '#059669',
                                    border: '1px solid rgba(5,150,105,0.15)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(5,150,105,0.08)'; }}
                            >💰 단가 관리</button>
                            <span style={{
                                fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                                background: 'rgba(79,70,229,0.06)', color: '#4f46e5',
                            }}>Step {currentStep} / {WIZARD_STEPS.length}</span>
                            <button
                                onClick={handleSignOut}
                                style={{
                                    fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                                    background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626',
                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    marginLeft: 8,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>

                    {/* Bottom Table Row */}
                    <div style={{ borderTop: '1px solid #e2e8f0', background: '#fafbfc' }}>
                        <StepIndicator />
                    </div>
                </header>

                {/* ════════ Body: Sidebar + Main ════════ */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ──── Left Sidebar ──── */}
                    <aside style={{
                        width: SIDEBAR_W,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: '1px solid #e2e8f0',
                        background: '#fafbfc',
                        flexShrink: 0,
                    }}>

                        {/* ▸ 고정 영역 1: 제목 + 설명 */}
                        <div style={{
                            padding: `${PAD}px ${PAD}px 12px ${PAD}px`,
                            flexShrink: 0,
                        }}>
                            <h2 style={{
                                fontSize: 22, fontWeight: 800, marginBottom: 4,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>{stepInfo.title}</h2>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                                {stepInfo.description}
                            </p>
                        </div>



                        {/* ▸ 스크롤 영역: 스텝 콘텐츠 */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: `${PAD}px ${PAD}px 24px ${PAD}px`,
                        }}>
                            <div className="animate-in" key={currentStep}>
                                {renderStepContent(currentStep)}
                            </div>
                        </div>

                        {/* ▸ 고정 영역 3: 이전/다음 버튼 */}
                        <div style={{
                            padding: `12px ${PAD}px`,
                            borderTop: '1px solid #f1f5f9',
                            background: '#ffffff',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className="btn-secondary"
                                    style={{ flex: 1, opacity: currentStep === 1 ? 0.5 : 1 }}
                                >이전</button>
                                <button
                                    onClick={() => {
                                        if (currentStep < WIZARD_STEPS.length) {
                                            nextStep();
                                        } else {
                                            // Validation
                                            const missing: string[] = [];
                                            if (!useDesignStore.getState().sizePresetId && useDesignStore.getState().customWidth === 0) missing.push('사이즈');
                                            if (!useDesignStore.getState().coreId) missing.push('스트링 코어');
                                            if (!useDesignStore.getState().coverId) missing.push('커버');
                                            if (useDesignStore.getState().topFoamEnabled && !useDesignStore.getState().topFoamOptionId) missing.push('상단폼');
                                            if (!useDesignStore.getState().packagingId) missing.push('포장');
                                            if (!useDesignStore.getState().deliveryId) missing.push('배송');

                                            if (missing.length > 0) {
                                                alert(`다음 정보가 선택되지 않았습니다:\n- ${missing.join('\n- ')}`);
                                            } else {
                                                setIsCompletionOpen(true);
                                            }
                                        }
                                    }}
                                    className="btn-primary"
                                    style={{ flex: 2 }}
                                >{currentStep === WIZARD_STEPS.length ? '설계 완료' : '다음 단계'}</button>
                            </div>
                        </div>
                    </aside>

                    {/* ──── Right: Drawing / 3D ──── */}
                    <main style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#f8fafc',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* 2D/3D 토글 */}
                        <div style={{
                            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                            zIndex: 10, display: 'flex', gap: 4,
                            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                            borderRadius: 20, padding: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            border: '1px solid #e2e8f0',
                        }}>
                            {(['2D', '3D'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                                        border: 'none', cursor: 'pointer',
                                        background: viewMode === mode ? '#4f46e5' : 'transparent',
                                        color: viewMode === mode ? '#fff' : '#94a3b8',
                                        transition: 'all 0.2s',
                                    }}
                                >{mode === '2D' ? '2D DRAWING' : '3D PREVIEW'}</button>
                            ))}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {viewMode === '2D' ? (
                                <div style={{ flex: 1, overflowY: 'auto', padding: `48px ${PAD}px ${PAD}px` }}>
                                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                                        <MattressDrawing />
                                        <div style={{ marginTop: PAD }}>
                                            <SpecSummary />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, padding: PAD, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <Mattress3D className="flex-1 shadow-lg ring-1 ring-slate-200 rounded-xl" />
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* ════════ Modals ════════ */}
            {isDevRequestOpen && (
                <DevelopmentRequestModal
                    onClose={() => setIsDevRequestOpen(false)}
                />
            )}
            {isCompletionOpen && (
                <CompletionModal
                    onClose={() => setIsCompletionOpen(false)}
                    onOpenDevRequest={() => {
                        setIsCompletionOpen(false);
                        setIsDevRequestOpen(true);
                    }}
                />
            )}
            {isPricingOpen && (
                <PricingManageModal
                    onClose={() => setIsPricingOpen(false)}
                />
            )}
        </div>
    );
}
