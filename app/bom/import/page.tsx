'use client';
import { useState } from 'react';
import { bomApiBlob, saveBlob, errMsg } from '../../lib/bom/client';
import { SIZE_PRESETS } from '../../lib/constants';
import { Card, Btn, Field, Select, ErrorBox, PageTitle, C } from '../_components/ui';

interface ImportResult { log?: string[]; counts?: Record<string, number>; error?: string }

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [sizeId, setSizeId] = useState('LK');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const doImport = async () => {
        if (!file) { setError('xlsx 파일을 선택하세요.'); return; }
        if (!confirm('가져온 데이터는 같은 코드의 기존 행을 덮어씁니다(상품의 BOM은 통째로 교체). 계속할까요?')) return;
        setBusy(true); setError(null); setResult(null);
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('size_preset_id', sizeId);
            const res = await fetch('/api/bom/import', { method: 'POST', body: fd });
            const j = (await res.json()) as ImportResult;
            setResult(j);
            if (!res.ok) setError(j.error ?? `HTTP ${res.status}`);
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };
    const doExport = async () => {
        setBusy(true); setError(null);
        try { saveBlob(await bomApiBlob('/export'), `BOM_export_${new Date().toISOString().slice(0, 10)}.xlsx`); }
        catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };

    return (
        <>
            <PageTitle title="엑셀 가져오기 / 내보내기" desc="매트리스_BOM_관리템플릿.xlsx 구조(시트 = 테이블)를 그대로 읽고 씁니다. 내보낸 파일을 수정해 다시 가져올 수 있습니다." />
            <ErrorBox error={error} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: C.text }}>가져오기</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <Field label="xlsx 파일"><input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>
                        <Field label="템플릿 상품의 사이즈" hint="템플릿 상품코드에 사이즈가 없으면 이 사이즈를 붙입니다(MAT-001 → MAT-001-LK). 이미 붙어 있으면 그대로 둡니다.">
                            <Select value={sizeId} onChange={e => setSizeId(e.target.value)}>{SIZE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} {p.width}×{p.depth}</option>)}</Select>
                        </Field>
                        <Btn variant="primary" onClick={doImport} disabled={busy || !file}>{busy ? '처리 중…' : '가져오기 실행'}</Btn>
                    </div>
                    <ul style={{ margin: '14px 0 0', paddingLeft: 16, fontSize: 11, color: C.sub, lineHeight: 1.6 }}>
                        <li>위자드 옵션과 연결된 품목(CV/FM/ST/CT/SN/PK 시드)은 품명이 덮어써지지 않습니다.</li>
                        <li>템플릿의 구 품번(CT-002~006 부속품, CV-010 폼)은 새 체계로 재번호되고, 일반 커버 패널 CV-001~003은 제외됩니다.</li>
                        <li>중간에 실패하면 그 단계 이전 데이터는 저장된 상태로 남습니다. 파일을 고쳐 다시 가져오면 덮어씁니다.</li>
                    </ul>
                </Card>
                <Card>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: C.text }}>내보내기</h3>
                    <p style={{ fontSize: 12, color: C.sub, margin: '0 0 12px' }}>현재 DB 전체(상품·품목·BOM·협력사·담당자·AVL·NPI·완성률·ECN·코드표)를 시트 10개로 내려받습니다.</p>
                    <Btn variant="secondary" onClick={doExport} disabled={busy}>⬇ BOM_export_날짜.xlsx 다운로드</Btn>
                </Card>
            </div>
            {result && (
                <Card style={{ marginTop: 16 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.text }}>{result.error ? '가져오기 실패' : '가져오기 완료'}</h3>
                    {result.counts && <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>}
                    {(result.log ?? []).length > 0 && (
                        <pre style={{ margin: 0, fontSize: 11, color: C.sub, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', background: C.soft, padding: 12, borderRadius: 8 }}>{(result.log ?? []).join('\n')}</pre>
                    )}
                </Card>
            )}
        </>
    );
}
