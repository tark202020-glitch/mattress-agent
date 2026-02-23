import { useState } from 'react';
import { BrochureData } from '../../types/brochure';
import Page1 from './Page1';
import Page2 from './Page2';
import PromptEditorModal from './PromptEditorModal';

interface BrochurePreviewProps {
    data: BrochureData;
    onUpdatePrompts: (prompts: any) => void;
    onClose: () => void;
    onBack?: () => void;
}

export default function BrochurePreview({ data, onUpdatePrompts, onClose, onBack }: BrochurePreviewProps) {
    const [activeTab, setActiveTab] = useState<'page1' | 'page2'>('page1');
    const [showPromptEditor, setShowPromptEditor] = useState(false);

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>{`
                @media print {
                    @page { size: A3 landscape; margin: 0; }
                    body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body > div:not(#print-area) { display: none !important; }
                    .print-hide-container { display: none !important; }
                    #print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; }
                    .print-page { 
                        width: 1587px; height: 1123px; 
                        page-break-after: always; 
                        overflow: hidden; 
                        position: relative;
                        background: white;
                    }
                }
            `}</style>
            <div className="fixed inset-0 bg-black/80 flex flex-col print-hide-container" style={{ zIndex: 9999 }}>
                {/* Header */}
                <div className="h-14 bg-gray-900 flex justify-between items-center px-6 text-white border-b border-gray-800">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button onClick={onBack} className="text-gray-400 hover:text-white px-2 py-1 flex items-center gap-1">
                                ← 뒤로
                            </button>
                        )}
                        <h2 className="font-bold">브로셔 미리보기 ({data.meta.title})</h2>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowPromptEditor(true)}
                            className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded flex items-center gap-2"
                        >
                            📝 프롬프트 편집
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕ 닫기
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Left Sidebar (Controls) */}
                    <div className="w-64 bg-gray-100 border-r p-4 space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-gray-700">페이지 선택</h3>
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => setActiveTab('page1')}
                                    className={`text-left px-3 py-2 rounded text-sm ${activeTab === 'page1' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-200'}`}
                                >
                                    Page 1: 표지 & 컨셉
                                </button>
                                <button
                                    onClick={() => setActiveTab('page2')}
                                    className={`text-left px-3 py-2 rounded text-sm ${activeTab === 'page2' ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-200'}`}
                                >
                                    Page 2: 스펙 & 구조
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <button
                                onClick={handlePrint}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-bold flex items-center justify-center gap-2"
                            >
                                📥 PDF 다운로드
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">저장 대화상자창에서 [PDF로 저장] 선택<br />가로 방향 / 가상 프린트 여백 없음으로 설정</p>
                        </div>
                    </div>

                    {/* Center Preview Area */}
                    <div className="flex-1 bg-gray-200 p-8 flex items-center justify-center overflow-auto">
                        {/* A3 Landscape Container (420mm x 297mm) */}
                        <div
                            className="bg-white shadow-xl relative transition-all duration-300 transform scale-[0.6] origin-top"
                            style={{ width: '1587px', height: '1123px' }} // A3 landscape pixel dimensions at 96dpi
                        >
                            {activeTab === 'page1' ? <Page1 data={data} /> : <Page2 data={data} />}
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {showPromptEditor && (
                    <PromptEditorModal
                        prompts={data.prompts}
                        onSave={(newPrompts) => {
                            onUpdatePrompts(newPrompts);
                            setShowPromptEditor(false);
                        }}
                        onClose={() => setShowPromptEditor(false)}
                    />
                )}
            </div>

            {/* =========================================
                PRINT ONLY AREA (Hidden on screen)
            ========================================= */}
            <div id="print-area" className="hidden">
                <div className="print-page">
                    <Page1 data={data} />
                </div>
                <div className="print-page">
                    <Page2 data={data} />
                </div>
            </div>
        </>
    );
}
