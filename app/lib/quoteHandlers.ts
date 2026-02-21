

export const handleDownloadQuote = async (designState: any, custom: any, summary: any, calculateSummary: any) => {
    try {
        const { COVER_OPTIONS, TOP_FOAM_OPTIONS, CORE_OPTIONS, CONTROLLER_OPTIONS, PACKAGING_OPTIONS, DELIVERY_OPTIONS, SIZE_PRESETS, calcCoreDimensions } = await import('./constants');

        // Prepare data
        const coverOpt = [...COVER_OPTIONS, ...custom.covers].find(c => c.id === designState.coverId);
        let coverName = '미선택';
        if (coverOpt) {
            if (coverOpt.label.includes('베이직')) coverName = 'Basic';
            else if (coverOpt.label.includes('스탠다드')) coverName = 'Standard';
            else if (coverOpt.label.includes('프리미엄')) coverName = 'Premium';
            else coverName = coverOpt.label;
        }

        const topFoam = [...TOP_FOAM_OPTIONS, ...custom.topFoams].find(o => o.id === designState.topFoamOptionId);
        const core = [...CORE_OPTIONS, ...custom.cores].find(c => c.id === designState.coreId);
        const cover = [...COVER_OPTIONS, ...custom.covers].find(c => c.id === designState.coverId);
        const ctrl = [...CONTROLLER_OPTIONS, ...custom.controllers].find(c => c.id === designState.controllerId);
        const pkg = [...PACKAGING_OPTIONS, ...custom.packagings].find(p => p.id === designState.packagingId);
        const dlv = [...DELIVERY_OPTIONS, ...custom.deliveries].find(d => d.id === designState.deliveryId);

        const gfEnabled = designState.guardFoamEnabled === true;
        const dims = designState.customWidth > 0
            ? calcCoreDimensions(designState.customWidth, designState.customDepth, designState.guardFoamThickness, designState.isDual, gfEnabled)
            : null;

        const summaryItems = [
            {
                label: '상단폼',
                value: designState.topFoamEnabled === true
                    ? (topFoam?.label || '선택중')
                    : designState.topFoamEnabled === false ? '미적용' : null,
            },
            {
                label: '가드폼',
                value: designState.guardFoamEnabled === true
                    ? `${designState.guardFoamThickness}mm / ${designState.guardFoamHardness}`
                    : designState.guardFoamEnabled === false
                        ? (designState.isDual ? `중앙 구분만 (${designState.guardFoamThickness}mm)` : '미적용')
                        : null,
            },
            {
                label: '하단폼',
                value: designState.bottomFoamEnabled === true
                    ? `${designState.bottomFoamThickness}mm / ${designState.bottomFoamHardness}`
                    : designState.bottomFoamEnabled === false ? '미적용' : null,
            },
            {
                label: '스트링',
                value: core
                    ? `${core.label}${designState.isDual ? ' × 2' : ''}`
                    : null,
                sub: dims ? `${dims.coreW} × ${dims.coreD} × ${core?.height || 200}mm` : null,
            },
            { label: '커버', value: cover?.label || null },
            { label: '컨트롤러', value: ctrl?.label || null },
            { label: '포장', value: pkg?.label || null },
            { label: '배송', value: dlv?.label || null },
        ];

        const title = designState.title;
        const specsList = summaryItems
            .filter(item => item.value !== null)
            .map(item => `- ${item.label}: ${item.value}${item.sub ? ` (${item.sub})` : ''}`);

        // Domestic: SS, Q, K, LK / Overseas: T, F, Q, K, CK
        const allSizes = [...SIZE_PRESETS, ...custom.sizes];
        const sizePreset = allSizes.find(s => s.id === designState.sizePresetId);
        const isKR = sizePreset?.region === '국내' || !sizePreset; // Assume KR if not found

        const sizeData: { label: string, w: number, d: number, h: number, price: number }[] = [];
        const h = designState.guardFoamThickness; // Approximate Height without calculating full... wait, let's just use 200 as base or totalH

        const addSizeData = (label: string, w: number, d: number) => {
            // create a temporary design state overrides
            const tempState = { ...designState, customWidth: w, customDepth: d };
            const tempSummary = calculateSummary(tempState);
            sizeData.push({
                label, w, d, h: 250, // placeholder H
                price: tempSummary.totalUnitPrice
            });
        };

        if (isKR) {
            addSizeData('SS', 1100, 2000);
            addSizeData('Q', 1500, 2000);
            addSizeData('K', 1600, 2000);
            addSizeData('LK', 1800, 2000);
        } else {
            addSizeData('T', 970, 1910);
            addSizeData('F', 1370, 1910);
            addSizeData('Q', 1520, 2030);
            addSizeData('K', 1930, 2030);
            addSizeData('CK', 1830, 2130);
        }

        const res = await fetch('/api/quote/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                coverName,
                title,
                specsList,
                sizeData
            })
        });

        if (!res.ok) throw new Error('API Reqeust Failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `견적서_${title || 'MDT-000'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error(e);
        alert('견적서 생성 실패');
    }
};
