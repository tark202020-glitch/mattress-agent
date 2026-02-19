'use client';

import { useState } from 'react';

export default function TestImagePage() {
    const [prompt, setPrompt] = useState('A premium mattress on a clean white background, studio lighting, high quality, 4k');
    const [aspectRatio, setAspectRatio] = useState('4:3');
    const [enhancePrompt, setEnhancePrompt] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [translatedPrompt, setTranslatedPrompt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setImageUrl(null);
        setTranslatedPrompt(null);
        setResponseTime(null);

        const startTime = Date.now();

        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, aspectRatio, enhancePrompt }),
            });

            const elapsed = Date.now() - startTime;
            setResponseTime(elapsed);

            const data = await res.json();

            if (!res.ok) {
                setError(`❌ [${res.status}] ${data.error || 'Unknown error'}\n\n📋 Details:\n${data.details || 'No details available'}`);
                return;
            }

            if (data.imageUrl) {
                setImageUrl(data.imageUrl);
                if (data.translatedPrompt) {
                    setTranslatedPrompt(data.translatedPrompt);
                }
            } else {
                setError('⚠️ No imageUrl in response. Full response:\n' + JSON.stringify(data, null, 2));
            }
        } catch (err: any) {
            const elapsed = Date.now() - startTime;
            setResponseTime(elapsed);
            setError(`🔥 Network/Client Error:\n${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            maxWidth: 800,
            margin: '40px auto',
            padding: 32,
            fontFamily: "'Inter', 'Pretendard', sans-serif",
        }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                🧪 Image Generation API Tester
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                <code>/api/generate-image</code> 엔드포인트를 직접 테스트합니다.
            </p>

            {/* Prompt */}
            <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Prompt
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    style={{
                        width: '100%',
                        padding: 12,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 14,
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Aspect Ratio */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Aspect Ratio
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['1:1', '4:3', '3:4', '16:9', '9:16'].map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 6,
                                border: '1px solid',
                                borderColor: aspectRatio === ratio ? '#4f46e5' : '#e2e8f0',
                                background: aspectRatio === ratio ? '#4f46e5' : '#fff',
                                color: aspectRatio === ratio ? '#fff' : '#475569',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {ratio}
                        </button>
                    ))}
                </div>
            </div>
            {/* Enhance Prompt Toggle */}
            <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={enhancePrompt}
                        onChange={(e) => setEnhancePrompt(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: '#4f46e5' }}
                    />
                    <span>Enhance Prompt (LLM 프롬프트 재작성)</span>
                </label>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, marginLeft: 28 }}>
                    {enhancePrompt
                        ? '✅ ON: LLM이 프롬프트를 자동 재작성합니다 (품질↑, 정확도↓)'
                        : '❌ OFF: 입력한 프롬프트를 그대로 사용합니다 (정확도↑)'}
                </p>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                style={{
                    padding: '12px 32px',
                    background: loading ? '#94a3b8' : '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: 24,
                }}
            >
                {loading ? '⏳ 생성 중...' : '🚀 이미지 생성'}
            </button>

            {/* Response Time */}
            {responseTime !== null && (
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                    ⏱ 응답 시간: <strong>{(responseTime / 1000).toFixed(1)}초</strong>
                </div>
            )}

            {/* Translated Prompt */}
            {translatedPrompt && (
                <div style={{
                    padding: 12,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: 13,
                }}>
                    <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>
                        🌐 자동 번역됨 (한→영)
                    </div>
                    <div style={{ color: '#1e3a5f', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {translatedPrompt}
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: 16,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    marginBottom: 20,
                }}>
                    <pre style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        fontSize: 13,
                        color: '#991b1b',
                        margin: 0,
                        fontFamily: 'monospace',
                    }}>
                        {error}
                    </pre>
                </div>
            )}

            {/* Image Display */}
            {imageUrl && (
                <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: '#f8fafc',
                }}>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                        ✅ 생성 성공! ({aspectRatio})
                    </div>
                    <img
                        src={imageUrl}
                        alt="Generated"
                        style={{ width: '100%', display: 'block' }}
                    />
                </div>
            )}
        </div>
    );
}
