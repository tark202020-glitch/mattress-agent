'use client';

import { useDesignStore } from '../lib/store';
import { WIZARD_STEPS } from '../lib/constants';

export default function StepIndicator() {
    const { currentStep, goToStep } = useDesignStore();

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 0,
            marginBottom: 0,
        }}>
            {WIZARD_STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                const isPending = step.id > currentStep;

                return (
                    <button
                        key={step.id}
                        onClick={() => goToStep(step.id)}
                        disabled={isPending}
                        style={{
                            position: 'relative',
                            padding: '8px 10px',
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            whiteSpace: 'nowrap',
                            cursor: isPending ? 'default' : 'pointer',
                            border: 'none',
                            background: 'transparent',
                            color: isActive
                                ? '#4f46e5'
                                : isCompleted
                                    ? '#0f172a'
                                    : '#94a3b8',
                            transition: 'color 0.2s',
                        }}
                    >
                        <span style={{ marginRight: 4, opacity: 0.4, fontSize: 10, fontFamily: 'monospace' }}>
                            {String(step.id).padStart(2, '0')}
                        </span>
                        {step.title}

                        {/* Active Indicator Line */}
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                bottom: 0, left: 0,
                                width: '100%', height: 2,
                                background: '#4f46e5',
                                borderRadius: '2px 2px 0 0',
                            }} />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
