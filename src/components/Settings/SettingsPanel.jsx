import React, { useState } from 'react';
import { Radio, Download, Upload, X, Trash2, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportData as doExport } from '../../utils/helpers';
import { Modal, Toggle, ConfirmDialog } from '../ui/SharedComponents';

const SettingsPanel = ({ isOpen, onClose }) => {
    const { settings, setSettings, getAllData, importData, metrics, clearAllData } = useApp();
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const targets = settings.nutritionTargets || { calories: 2500, protein: 180, carbs: 220, fat: 80 };
    const restDefaults = settings.restTimerDefaults || { strength: 180, hypertrophy: 90, cardio: 60, mobility: 30 };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                importData(data);
                alert('Data restored successfully!');
                onClose();
            } catch { alert('Invalid backup file.'); }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const handleClearData = () => {
        clearAllData();
        setShowClearConfirm(false);
        alert('All application data has been permanently cleared.');
        onClose();
    };

    const Field = ({ label, children, color = 'text-slate-500' }) => (
        <div className="pt-3 border-t border-navy-600/20">
            <label className={`section-label ${color} mb-2 block`}>{label}</label>
            {children}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings & Backup">
            <div className="space-y-4">
                {/* Myzone */}
                <div className="bg-navy-900 p-4 rounded-xl border border-navy-600/20">
                    <Toggle
                        label="Myzone Integration" sublabel="Track effort points (MEPs)"
                        enabled={settings.myzoneConnected}
                        onToggle={() => setSettings({ ...settings, myzoneConnected: !settings.myzoneConnected })}
                    />
                </div>

                {/* Weekly Target */}
                <Field label="Weekly Target (Days)">
                    <input type="number" value={settings.weeklyTarget} onChange={e => setSettings({ ...settings, weeklyTarget: Number(e.target.value) })} className="input" />
                </Field>

                {/* Main Target */}
                <Field label="Main Target" color="!text-accent-green">
                    <input type="text" value={settings.mainName} onChange={e => setSettings({ ...settings, mainName: e.target.value })}
                        className="input mb-2" placeholder="Target Name" />
                    <input type="date" value={settings.mainDate} onChange={e => setSettings({ ...settings, mainDate: e.target.value })} className="input mb-2" />
                    <select value={settings.currentPhase || 'Base Building'} onChange={e => setSettings({ ...settings, currentPhase: e.target.value })} className="input">
                        <option value="Base Building">Base Building</option>
                        <option value="Functional Strength">Functional Strength</option>
                        <option value="Specific Prep">Specific Prep</option>
                        <option value="Expedition Ready">Expedition Ready</option>
                    </select>
                </Field>

                {/* Sub Target */}
                <Field label="Milestone Target" color="!text-accent-blue">
                    <input type="text" value={settings.subName || ''} onChange={e => setSettings({ ...settings, subName: e.target.value })}
                        className="input mb-2" placeholder="Milestone Name" />
                    <input type="date" value={settings.subDate || ''} onChange={e => setSettings({ ...settings, subDate: e.target.value })} className="input" />
                </Field>

                <Field label="Profile">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Height</span>
                            <div className="flex items-center gap-2">
                                <input type="number" placeholder="cm" value={settings.height || ''} onChange={e => setSettings({ ...settings, height: Number(e.target.value) })} className="input" />
                                <span className="text-sm font-bold text-slate-500">cm</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Age</span>
                            <div className="flex items-center gap-2">
                                <input type="number" placeholder="yrs" value={settings.age || ''} onChange={e => setSettings({ ...settings, age: Number(e.target.value) })} className="input" />
                                <span className="text-sm font-bold text-slate-500">yrs</span>
                            </div>
                        </div>
                    </div>
                </Field>

                {/* Body Composition Baseline */}
                <Field label="Body Comp Baseline Date" color="!text-accent-cyan">
                    <select value={settings.bodyCompStartDate || ''} onChange={e => setSettings({ ...settings, bodyCompStartDate: e.target.value })} className="input">
                        <option value="">First Scan (Default)</option>
                        {[...metrics].sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => (
                            <option key={m.date} value={m.date}>{m.date} — {m.weight}kg</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-600 mt-1">Dashboard "Total Change" calculates from this date</p>
                </Field>

                {/* Nutrition Targets */}
                <Field label="Nutrition Targets" color="!text-accent-red">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: 'calories', label: 'Calories', color: 'text-accent-red' },
                            { key: 'protein', label: 'Protein (g)', color: 'text-accent-green' },
                            { key: 'carbs', label: 'Carbs (g)', color: 'text-accent-blue' },
                            { key: 'fat', label: 'Fat (g)', color: 'text-accent-amber' },
                        ].map(item => (
                            <div key={item.key}>
                                <span className={`text-[10px] font-bold uppercase ${item.color}`}>{item.label}</span>
                                <input type="number" value={targets[item.key]} onChange={e => setSettings({
                                    ...settings, nutritionTargets: { ...targets, [item.key]: Number(e.target.value) }
                                })} className={`input !text-sm !font-bold !${item.color}`} />
                            </div>
                        ))}
                    </div>
                </Field>

                {/* Water Target */}
                <Field label="Daily Water Target">
                    <div className="flex items-center gap-2">
                        <input type="number" value={settings.waterTarget || 3000} onChange={e => setSettings({ ...settings, waterTarget: Number(e.target.value) })} className="input" />
                        <span className="text-sm font-bold text-slate-500">ml</span>
                    </div>
                </Field>

                {/* Rest Timer Defaults */}
                <Field label="Rest Timer Defaults (seconds)">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: 'strength', label: 'Strength' },
                            { key: 'hypertrophy', label: 'Hypertrophy' },
                            { key: 'cardio', label: 'Cardio' },
                            { key: 'mobility', label: 'Mobility' },
                        ].map(item => (
                            <div key={item.key}>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
                                <input type="number" value={restDefaults[item.key]} onChange={e => setSettings({
                                    ...settings, restTimerDefaults: { ...restDefaults, [item.key]: Number(e.target.value) }
                                })} className="input !text-sm !font-bold" />
                            </div>
                        ))}
                    </div>
                </Field>

                {/* Backup */}
                <div className="pt-4 border-t border-navy-600/20 flex flex-col gap-3">
                    <button onClick={() => doExport(getAllData())}
                        className="btn-ghost w-full flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Backup Data (JSON)
                    </button>
                    <label className="btn-ghost w-full flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4" /> Restore Backup
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 mt-2 border-t border-red-900/30 flex flex-col gap-3">
                    <button onClick={() => setShowClearConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/20 font-bold transition-colors">
                        <AlertTriangle className="w-4 h-4" /> Wipe All Data
                    </button>
                </div>

                <button onClick={onClose} className="btn-primary w-full mt-4 font-black">Close Settings</button>
            </div>

            <ConfirmDialog
                isOpen={showClearConfirm}
                title="Wipe All Application Data?"
                message="This will permanently delete all workouts, nutrition logs, body scans, routines, and custom exercises. Make sure you back up first! This action cannot be undone."
                confirmLabel="Yes, Wipe Data"
                danger={true}
                onConfirm={handleClearData}
                onCancel={() => setShowClearConfirm(false)}
            />
        </Modal>
    );
};

export default SettingsPanel;
