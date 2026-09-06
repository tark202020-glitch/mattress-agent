'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bomApi, errMsg } from '../../lib/bom/client';
import { Card, Table, Badge, Btn, Spinner, ErrorBox, PageTitle, Select, C } from '../_components/ui';

interface Product { product_code: string; model_code: string; name: string; family: string | null; status: string; size_preset_id: string; width_mm: number; depth_mm: number; is_dual: boolean; updated_at: string }
interface Group { model_code: string; products: Product[] }

const STATUS_TONE: Record<string, 'muted' | 'info' | 'ok' | 'danger'> = { '기획': 'muted', '개발': 'info', '양산': 'ok', '단종': 'danger' };

export default function ProductsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');

    useEffect(() => {
        setGroups(null);
        bomApi<Group[]>(`/products${status ? `?status=${encodeURIComponent(status)}` : ''}`).then(setGroups).catch(e => setError(errMsg(e)));
    }, [status]);

    return (
        <>
            <PageTitle title="상품 / BOM" desc="위자드에서 저장한 상품과 엑셀로 가져온 상품. 모델 코드별로 사이즈 상품을 묶어 보여줍니다."
                right={<>
                    <Select value={status} onChange={e => setStatus(e.target.value)}><option value="">전체 상태</option>{['기획', '개발', '양산', '단종'].map(s => <option key={s}>{s}</option>)}</Select>
                    <Btn variant="primary" onClick={() => router.push('/builder')}>+ 위자드에서 새 상품</Btn>
                </>} />
            <ErrorBox error={error} />
            {!groups && !error && <Spinner />}
            {groups && groups.length === 0 && <Card><div style={{ textAlign: 'center', color: C.sub, padding: 24 }}>상품이 없습니다. 위자드 9단계에서 저장하거나 엑셀 탭에서 가져오세요.</div></Card>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {groups?.map(g => (
                    <Card key={g.model_code}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{g.model_code}</span>
                            <span style={{ fontSize: 13, color: C.sub }}>{g.products[0]?.name}</span>
                            <Badge tone="info">{g.products.length} 사이즈</Badge>
                        </div>
                        <Table<Product> rowKey={p => p.product_code} rows={g.products} onRowClick={p => router.push(`/bom/products/${p.product_code}`)}
                            columns={[
                                { key: 'product_code', header: '상품코드', width: 180 },
                                { key: 'size', header: '사이즈', render: p => `${p.size_preset_id} (${p.width_mm}×${p.depth_mm})` },
                                { key: 'dual', header: '구조', render: p => p.is_dual ? 'Dual' : 'Single' },
                                { key: 'family', header: '상품군', render: p => p.family ?? '-' },
                                { key: 'status', header: '상태', render: p => <Badge tone={STATUS_TONE[p.status] ?? 'muted'}>{p.status}</Badge> },
                                { key: 'updated_at', header: '수정', render: p => new Date(p.updated_at).toLocaleDateString('ko-KR') },
                            ]} />
                    </Card>
                ))}
            </div>
        </>
    );
}
