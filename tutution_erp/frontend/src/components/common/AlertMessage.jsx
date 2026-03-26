import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const AlertMessage = ({ type = 'info', message, style, className = '' }) => {
    if (!message) return null;

    const config = {
        success: {
            icon: CheckCircle,
            bg: '#ecfdf5',
            border: '#a7f3d0',
            text: '#047857',
            iconColor: '#10b981'
        },
        error: {
            icon: AlertCircle,
            bg: '#fef2f2',
            border: '#fecaca',
            text: '#b91c1c',
            iconColor: '#ef4444'
        },
        warning: {
            icon: AlertCircle,
            bg: '#fffbeb',
            border: '#fde68a',
            text: '#b45309',
            iconColor: '#f59e0b'
        },
        info: {
            icon: Info,
            bg: '#eff6ff',
            border: '#bfdbfe',
            text: '#1d4ed8',
            iconColor: '#3b82f6'
        }
    };

    const currentConfig = config[type] || config.info;
    const Icon = currentConfig.icon;

    return (
        <div
            className={`alert-message flex items-center gap-2 px-4 py-3 rounded-lg border shadow-sm ${className}`}
            style={{
                backgroundColor: currentConfig.bg,
                borderColor: currentConfig.border,
                color: currentConfig.text,
                fontSize: '0.875rem',
                fontWeight: 500,
                ...style
            }}
        >
            <Icon size={18} color={currentConfig.iconColor} className="shrink-0" />
            <span>{message}</span>
        </div>
    );
};

export default AlertMessage;
