'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { CONTROLLER_OPTIONS, PACKAGING_OPTIONS, DELIVERY_OPTIONS } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge } from '../AddOptionModal';

interface GenericStepProps {
    stepKey: 'controller' | 'packaging' | 'delivery';
}

const optionSets = {
    controller: CONTROLLER_OPTIONS,
    packaging: PACKAGING_OPTIONS,
    delivery: DELIVERY_OPTIONS,
};

const icons: Record<string, string> = {
    NUMBERING: '🔢', CTRL_1_6: '🎛️', IOT: '📡', IOT_STICK: '📱',
    ROLL: '🌀', FOLD_3: '📐', SEPARATE: '📦',
    DIRECT_PRODUCT: '🚛', DIRECT_PACKED: '📬', PARCEL: '🚚',
};

const stepLabels: Record<string, string> = {
    controller: '컨트롤러',
    packaging: '포장',
    delivery: '배송',
};

export function StepGenericSelect({ stepKey }: GenericStepProps) {
    const store = useDesignStore();
    const custom = useCustomOptionsStore();
    const [showAdd, setShowAdd] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { custom._hydrate(); setMounted(true); }, []);

    const builtinOptions = optionSets[stepKey];

    const customOptionsMap = {
        controller: custom.controllers,
        packaging: custom.packagings,
        delivery: custom.deliveries,
    };
    const customOptions = customOptionsMap[stepKey];

    const addersMap = {
        controller: custom.addController,
        packaging: custom.addPackaging,
        delivery: custom.addDelivery,
    };
    const removersMap = {
        controller: custom.removeController,
        packaging: custom.removePackaging,
        delivery: custom.removeDelivery,
    };

    const allOptions = [...builtinOptions, ...customOptions];
    const isCustom = (id: string) => customOptions.some(o => o.id === id);

    const stateMap = {
        controller: { selectedId: store.controllerId, setter: store.setController },
        packaging: { selectedId: store.packagingId, setter: store.setPackaging },
        delivery: { selectedId: store.deliveryId, setter: store.setDelivery },
    };

    const { selectedId, setter } = stateMap[stepKey];

    return (
        <div className="animate-in">
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
            }}>
                {allOptions.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    const custom = isCustom(opt.id);
                    return (
                        <button
                            key={opt.id}
                            onClick={() => setter(opt.id)}
                            className="card"
                            style={{
                                padding: 20, textAlign: 'left',
                                cursor: 'pointer', transition: 'all 0.2s',
                                position: 'relative',
                                ...(isSelected ? {
                                    borderColor: '#4f46e5',
                                    background: 'rgba(79, 70, 229, 0.04)',
                                    boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.15)',
                                } : {}),
                            }}
                        >
                            {custom && <DeleteBadge onClick={() => removersMap[stepKey](opt.id)} />}
                            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.9 }}>
                                {icons[opt.id] || '📋'}
                            </div>
                            <div style={{
                                fontWeight: 700, fontSize: 16, marginBottom: 4,
                                color: isSelected ? '#4f46e5' : '#0f172a',
                            }}>
                                {opt.label}
                            </div>
                            <div style={{
                                fontSize: 13, color: isSelected ? '#6366f1' : '#94a3b8',
                            }}>
                                {opt.description}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: 12 }}>
                <AddButton onClick={() => setShowAdd(true)} label={`새 ${stepLabels[stepKey]} 옵션 추가`} />
            </div>

            {showAdd && (
                <AddOptionModal
                    title={`새 ${stepLabels[stepKey]} 옵션 추가`}
                    fields={[
                        { key: 'label', label: '네이밍 (이름)', type: 'text', placeholder: '이름 입력' },
                        { key: 'description', label: '특징 (설명)', type: 'text', placeholder: '특징 입력' },
                    ]}
                    onSave={vals => {
                        addersMap[stepKey]({
                            id: `CUSTOM_${stepKey.toUpperCase()}_${Date.now()}`,
                            label: vals.label,
                            description: vals.description,
                        });
                    }}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </div>
    );
}
