import React from 'react';
import {
    Dumbbell, HeartPulse, Move, TrendingUp, ChevronRight, ChevronLeft,
    X, Trash2, Plus, CheckCircle2, Square, Play
} from 'lucide-react';

// ── Category Icons ──
export const getCategoryIcon = (cat, size = 'w-5 h-5') => {
    const icons = {
        weight: <Dumbbell className={size} />,
        cardio: <HeartPulse className={size} />,
        mobility: <Move className={size} />,
    };
    return icons[cat] || <Dumbbell className={size} />;
};

export const CATEGORY_COLORS = {
    weight: { text: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/20' },
    cardio: { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    mobility: { text: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/20' },
};

// ── Media Renderer (Image/Video) ──
export const MediaRenderer = ({ src, className, alt = "" }) => {
    if (!src) return null;
    const isVideo = src.match(/\.(mp4|webm)$/i) || src.startsWith('data:video/');
    if (isVideo) {
        return <video src={src} className={className} autoPlay loop muted playsInline />;
    }
    return <img src={src} className={className} alt={alt} loading="lazy" />;
};

// ── Time Filter Select ──
export const TimeFilter = ({ value, onChange }) => (
    <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-navy-800 text-xs font-bold text-slate-400 p-2 rounded-xl border border-navy-600/30 outline-none cursor-pointer"
    >
        <option value="1W">1 Week</option>
        <option value="1M">1 Month</option>
        <option value="3M">3 Months</option>
        <option value="6M">6 Months</option>
        <option value="1Y">1 Year</option>
        <option value="ALL">All Time</option>
    </select>
);

// ── Section Header ──
export const SectionHeader = ({ icon: Icon, title, iconColor = 'text-accent-blue', children }) => (
    <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            {title}
        </h3>
        {children}
    </div>
);

// ── Macro Progress Bar ──
export const MacroBar = ({ label, current, target, colorClass, icon: Icon }) => {
    const isOver = current > target;
    const percent = Math.min(100, (current / target) * 100);
    const activeColor = isOver ? 'bg-accent-red' : colorClass;
    const activeText = isOver ? 'text-accent-red' : colorClass.replace('bg-', 'text-');

    return (
        <div className="bg-navy-900 p-3 rounded-xl border border-navy-600/20">
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1">
                    <Icon className={`w-3 h-3 ${activeText}`} />
                    <span className={`section-label ${isOver ? '!text-accent-red' : ''}`}>{label}</span>
                </div>
                <span className="text-xs font-black text-white">
                    {Math.round(current)}<span className="text-[10px] text-slate-500 font-normal">/{target}g</span>
                </span>
            </div>
            <div className="progress-bar">
                <div
                    className={`progress-fill ${activeColor}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
};

// ── Empty State ──
export const EmptyState = ({ icon: Icon, title, subtitle, children }) => (
    <div className="bg-navy-900/50 border-2 border-dashed border-navy-600/30 p-8 rounded-2xl text-center">
        {Icon && <Icon className="w-8 h-8 text-slate-600 mx-auto mb-3" />}
        <p className="text-slate-400 font-bold mb-1">{title}</p>
        {subtitle && <p className="text-sm text-slate-600 mb-6">{subtitle}</p>}
        {children}
    </div>
);

// ── Modal / Bottom Sheet ──
export const BottomSheet = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <>
            <div className="bottom-sheet-overlay" onClick={onClose} />
            <div className="bottom-sheet">
                <div className="p-5 border-b border-navy-600/30 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-black text-white">{title}</h3>
                    <button onClick={onClose} className="btn-icon bg-navy-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5">
                    {children}
                </div>
            </div>
        </>
    );
};

// ── Modal (Centered) ──
export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div
                className="bg-navy-800 rounded-3xl w-full max-w-sm shadow-2xl border border-navy-600/30 max-h-[90vh] overflow-y-auto animate-scale-in [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-navy-600/30 flex justify-between items-center sticky top-0 bg-navy-800 z-10 rounded-t-3xl">
                    <h3 className="font-bold text-lg text-white">{title}</h3>
                    <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

// ── Stat Card ──
export const StatCard = ({ label, value, unit, change, changePositive, className = '' }) => (
    <div className={`bg-navy-900 p-3 rounded-xl text-center ${className}`}>
        <p className="section-label mb-1">{label}</p>
        <p className="text-xl font-black text-white">
            {value}<span className="text-xs text-slate-500 font-normal ml-0.5">{unit}</span>
        </p>
        {change !== undefined && change !== null && (
            <p className={`text-xs font-bold mt-1 ${changePositive ? 'text-accent-green' : 'text-accent-red'}`}>
                {change > 0 ? '+' : ''}{change}
            </p>
        )}
    </div>
);

// ── Toggle Switch ──
export const Toggle = ({ enabled, onToggle, label, sublabel }) => (
    <div className="flex items-center justify-between">
        <div>
            <h4 className="font-bold text-sm text-white">{label}</h4>
            {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
        </div>
        <button
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-accent-blue' : 'bg-navy-600'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
);

// ── Confirm Dialog ──
export const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title = 'Confirm', message = 'Are you sure?', confirmLabel = 'Delete', danger = true }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in" onClick={onCancel}>
            <div className="bg-navy-800 rounded-2xl w-full max-w-xs shadow-2xl border border-navy-600/30 animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-5 text-center">
                    <h3 className="font-bold text-lg text-white mb-2">{title}</h3>
                    <p className="text-sm text-slate-400 mb-5">{message}</p>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
                        <button onClick={onConfirm} className={`flex-1 btn ${danger ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
