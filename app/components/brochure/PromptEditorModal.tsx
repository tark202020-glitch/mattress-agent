import { useState } from 'react';
import { BrochurePrompts } from '../../types/brochure';

interface PromptEditorModalProps {
    prompts: BrochurePrompts;
    onSave: (newPrompts: BrochurePrompts) => void;
    onClose: () => void;
    saveLabel?: string;
}

export default function PromptEditorModal({ prompts, onSave, onClose, saveLabel }: PromptEditorModalProps) {
    const [editedPrompts, setEditedPrompts] = useState<BrochurePrompts>(prompts);

    const handleChange = (key: keyof BrochurePrompts, value: string) => {
        setEditedPrompts(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[800px] h-[80vh] flex flex-col p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">AI 이미지 프롬프트 편집</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Page 1 Main Prompt */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Page 1: 메인 이미지 (제품 전체 뷰)</label>
                        <textarea
                            className="w-full h-32 p-3 border rounded bg-gray-50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editedPrompts.page1_main}
                            onChange={(e) => handleChange('page1_main', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">💡 팁: 조명, 배경 인테리어, 분위기 키워드를 추가해보세요.</p>
                    </div>

                    {/* Page 1 Sub Prompt */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Page 1: 서브 이미지 (디테일/질감)</label>
                        <textarea
                            className="w-full h-24 p-3 border rounded bg-gray-50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editedPrompts.page1_sub}
                            onChange={(e) => handleChange('page1_sub', e.target.value)}
                        />
                    </div>

                    {/* Page 2 Layer Prompt */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Page 2: 레이어 구조 이미지</label>
                        <textarea
                            className="w-full h-24 p-3 border rounded bg-gray-50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editedPrompts.page2_layer}
                            onChange={(e) => handleChange('page2_layer', e.target.value)}
                        />
                    </div>

                    {/* Page 2 Detail Prompt */}
                    <div>
                        <label className="block text-sm font-semibold mb-2">Page 2: 구조/분해 이미지 (내장재)</label>
                        <textarea
                            className="w-full h-32 p-3 border rounded bg-gray-50 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editedPrompts.page2_detail}
                            onChange={(e) => handleChange('page2_detail', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => onSave(editedPrompts)}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        {saveLabel || '변경사항 저장 및 적용'}
                    </button>
                </div>
            </div>
        </div>
    );
}
