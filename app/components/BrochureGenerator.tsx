import { useState, useEffect } from 'react';
import { useDesignStore } from '../lib/store';
import { convertStateToBrochureData } from '../lib/brochureUtils';
import { BrochureData } from '../types/brochure';
import BrochurePreview from './brochure/BrochurePreview';

import PromptEditorModal from './brochure/PromptEditorModal';

interface BrochureGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BrochureGenerator({ isOpen, onClose }: BrochureGeneratorProps) {
    const designState = useDesignStore();
    const [brochureData, setBrochureData] = useState<BrochureData | null>(null);
    const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');

    // 모달이 열릴 때 데이터 초기화 및 스텝 리셋
    useEffect(() => {
        if (isOpen) {
            const initData = convertStateToBrochureData(designState);
            setBrochureData(initData);
            setStep('prompt'); // 항상 프롬프트 확인부터 시작
        }
    }, [isOpen, designState]);

    if (!isOpen || !brochureData) return null;

    const handleUpdatePrompts = async (newPrompts: any) => {
        // 1. 프롬프트 업데이트 (일단 상태에 저장)
        setBrochureData(prev => prev ? ({ ...prev, prompts: newPrompts }) : null);
        setStep('generating'); // 로딩 시작

        try {
            // 2. 이미지 생성 API 호출 (병렬)
            // A3 Landscape의 반쪽(50%)은 A4 Portrait(210x297)이므로 3:4 비율이 적합
            // 작은 이미지는 4:3 이용
            const generate = async (prompt: string, ratio: string) => {
                try {
                    const res = await fetch('/api/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt, aspectRatio: ratio })
                    });
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({})); // Try to parse JSON
                        throw new Error(errorData.error || errorData.details || `API Error: ${res.status}`);
                    }
                    const data = await res.json();
                    return data.imageUrl;
                } catch (err: any) {
                    console.error('Image Gen Failed:', prompt, err);
                    return null; // 실패 시 null 반환 (기존 이미지 유지)
                }
            };

            // 4장 동시 생성 시도 (Promise.all)
            // 주의: Vertex AI Quota에 걸릴 수 있으므로 순차적으로 할 수도 있음. 일단 병렬 시도.
            const [img1, img2, img3, img4] = await Promise.all([
                generate(newPrompts.page1_main, '3:4'),
                generate(newPrompts.page1_sub, '4:3'),
                generate(newPrompts.page2_layer, '3:4'),
                generate(newPrompts.page2_detail, '4:3')
            ]);

            // 3. 이미지 URL 업데이트 (성공한 것만)
            setBrochureData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    images: {
                        ...prev.images,
                        page1_main: img1 || prev.images.page1_main,
                        page1_sub: img2 || prev.images.page1_sub,
                        page2_layer: img3 || prev.images.page2_layer,
                        page2_detail: img4 || prev.images.page2_detail,
                    }
                };
            });

            setStep('preview'); // 완료 후 미리보기

        } catch (error: any) {
            console.error('Generator Error:', error);
            alert(`이미지 생성 실패: ${error.message}\n(Google Cloud 인증 또는 프로젝트 ID 설정을 확인해주세요)`);
            setStep('preview'); // 에러 나도 미리보기로 이동
        }
    };

    return (
        <>
            {step === 'prompt' && (
                <PromptEditorModal
                    prompts={brochureData.prompts}
                    onSave={handleUpdatePrompts}
                    onClose={onClose}
                    saveLabel="AI 이미지 생성 및 브로셔 보기"
                />
            )}
            {step === 'generating' && (
                <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h2 className="text-2xl font-bold mb-2">AI가 브로셔 이미지를 생성하고 있습니다</h2>
                    <p className="text-gray-400">약 30~60초 정도 소요됩니다. 잠시만 기다려주세요...</p>
                    <div className="mt-8 text-sm text-gray-500 bg-gray-900 px-4 py-2 rounded">
                        Tip: Google Vertex AI (Imagen) 모델을 사용 중입니다.
                    </div>
                </div>
            )}
            {step === 'preview' && (
                <BrochurePreview
                    data={brochureData}
                    onUpdatePrompts={(newPrompts) => setBrochureData(prev => prev ? ({ ...prev, prompts: newPrompts }) : null)}
                    onClose={onClose}
                    onBack={() => setStep('prompt')}
                />
            )}
        </>
    );
}
