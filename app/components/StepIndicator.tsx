'use client';

import { useDesignStore } from '../lib/store';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import {
    WIZARD_STEPS,
    SIZE_PRESETS,
    CORE_OPTIONS,
    COVER_OPTIONS,
    CONTROLLER_OPTIONS,
    PACKAGING_OPTIONS,
    DELIVERY_OPTIONS
} from '../lib/constants';
import { useEffect, useState } from 'react';

export default function StepIndicator() {
    const {
        currentStep, goToStep,
        sizePresetId, customWidth, customDepth,
        structureType,
        coreId, coverId, controllerId, packagingId, deliveryId
    } = useDesignStore();

    const {
        cores, covers, controllers, packagings, deliveries, _hydrate
    } = useCustomOptionsStore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        _hydrate();
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const getStepText = (stepId: number) => {
        switch (stepId) {
            case 1: {
                if (sizePresetId) {
                    const preset = SIZE_PRESETS.find(s => s.id === sizePresetId);
                    return preset ? `${preset.id} ${preset.width}*${preset.depth}` : '-';
                } else if (customWidth > 0 && customDepth > 0) {
                    return `커스텀 ${customWidth}*${customDepth}`;
                }
                return '-';
            }
            case 2: {
                if (structureType) {
                    return structureType.charAt(0).toUpperCase() + structureType.slice(1);
                }
                return '-';
            }
            case 3: {
                if (coreId) {
                    const allCores = [...CORE_OPTIONS, ...cores];
                    const found = allCores.find(c => c.id === coreId);
                    return found ? found.label : '-';
                }
                return '-';
            }
            case 4: {
                if (coverId) {
                    const allCovers = [...COVER_OPTIONS, ...covers];
                    const found = allCovers.find(c => c.id === coverId);
                    return found ? found.label : '-';
                }
                return '-';
            }
            case 5: {
                if (controllerId) {
                    const allCtrls = [...CONTROLLER_OPTIONS, ...controllers];
                    const found = allCtrls.find(c => c.id === controllerId);
                    return found ? found.label : '-';
                }
                return '-';
            }
            case 6: {
                if (packagingId) {
                    const allPacks = [...PACKAGING_OPTIONS, ...packagings];
                    const found = allPacks.find(c => c.id === packagingId);
                    return found ? found.label : '-';
                }
                return '-';
            }
            case 7: {
                if (deliveryId) {
                    const allDelivs = [...DELIVERY_OPTIONS, ...deliveries];
                    const found = allDelivs.find(c => c.id === deliveryId);
                    return found ? found.label : '-';
                }
                return '-';
            }
            default: return '-';
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, 1fr)`,
            width: '100%',
            background: '#ffffff',
        }}>
            {WIZARD_STEPS.map((step, idx) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isPending = step.id > currentStep;
                const stepText = getStepText(step.id);
                const hasValue = stepText !== '-';

                return (
                    <button
                        key={step.id}
                        onClick={() => {
                            if (!isPending || hasValue) goToStep(step.id);
                        }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px 4px',
                            borderRight: idx !== WIZARD_STEPS.length - 1 ? '1px solid #e2e8f0' : 'none',
                            borderBottom: isActive ? '3px solid #4338ca' : '3px solid transparent',
                            background: isActive ? '#e0e7ff' : 'transparent',
                            cursor: (isPending && !hasValue) ? 'default' : 'pointer',
                            transition: 'all 0.2s ease',
                            outline: 'none',
                            boxShadow: isActive ? 'inset 0 0 12px rgba(67, 56, 202, 0.05)' : 'none',
                        }}
                    >
                        <span style={{
                            fontSize: 13,
                            color: isActive ? '#3730a3' : '#64748b',
                            fontWeight: isActive ? 700 : 500,
                            marginBottom: 2,
                        }}>
                            {step.title}
                        </span>
                        <span style={{
                            fontSize: 13,
                            color: hasValue ? '#334155' : '#cbd5e1',
                            fontWeight: hasValue ? 600 : 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            padding: '0 8px',
                        }}>
                            {stepText}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
