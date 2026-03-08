import React, { useState, useMemo } from 'react';
import {
    Scale, PlusCircle, Trash2, ChevronRight, ChevronDown, Activity, Target, Bed
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { getToday, filterByTime } from '../../utils/helpers';
import { TimeFilter, SectionHeader } from '../ui/SharedComponents';

const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid #243049', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0' }
};

// ── Body Diagram SVG ──
const BodyDiagram = ({ segLean = {}, segFat = {}, mode = 'lean' }) => {
    const data = mode === 'lean' ? segLean : segFat;
    const color = mode === 'lean' ? '#10b981' : '#f43f5e';
    const bgColor = mode === 'lean' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)';

    return (
        <div className="relative w-full max-w-[220px] mx-auto">
            <svg viewBox="0 0 200 380" className="w-full h-auto">
                {/* Head */}
                <circle cx="100" cy="35" r="25" fill={bgColor} stroke={color} strokeWidth="1.5" opacity="0.4" />
                {/* Trunk */}
                <rect x="60" y="65" width="80" height="110" rx="10" fill={bgColor} stroke={color} strokeWidth="1.5" />
                <text x="100" y="125" textAnchor="middle" fill={color} fontSize="13" fontWeight="800">
                    {data.trunk || 0}
                </text>
                <text x="100" y="138" textAnchor="middle" fill={color} fontSize="8" opacity="0.7">kg</text>
                {/* Left Arm */}
                <rect x="10" y="75" width="40" height="90" rx="14" fill={bgColor} stroke={color} strokeWidth="1.5" />
                <text x="30" y="125" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">
                    {data.lArm || 0}
                </text>
                <text x="30" y="136" textAnchor="middle" fill={color} fontSize="7" opacity="0.7">L Arm</text>
                {/* Right Arm */}
                <rect x="150" y="75" width="40" height="90" rx="14" fill={bgColor} stroke={color} strokeWidth="1.5" />
                <text x="170" y="125" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">
                    {data.rArm || 0}
                </text>
                <text x="170" y="136" textAnchor="middle" fill={color} fontSize="7" opacity="0.7">R Arm</text>
                {/* Left Leg */}
                <rect x="55" y="185" width="38" height="130" rx="14" fill={bgColor} stroke={color} strokeWidth="1.5" />
                <text x="74" y="255" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">
                    {data.lLeg || 0}
                </text>
                <text x="74" y="266" textAnchor="middle" fill={color} fontSize="7" opacity="0.7">L Leg</text>
                {/* Right Leg */}
                <rect x="107" y="185" width="38" height="130" rx="14" fill={bgColor} stroke={color} strokeWidth="1.5" />
                <text x="126" y="255" textAnchor="middle" fill={color} fontSize="11" fontWeight="800">
                    {data.rLeg || 0}
                </text>
                <text x="126" y="266" textAnchor="middle" fill={color} fontSize="7" opacity="0.7">R Leg</text>
            </svg>
        </div>
    );
};

const BodyTab = () => {
    const { metrics, addMetric, deleteMetric, settings } = useApp();
    const [subTab, setSubTab] = useState('log');
    const [analyticFilter, setAnalyticFilter] = useState('ALL');
    const [showForm, setShowForm] = useState(false);
    const [expandedDate, setExpandedDate] = useState(null);
    const [segMode, setSegMode] = useState('lean');
    const [form, setForm] = useState({
        date: getToday(), weight: '', fat: '', muscleMass: '', bodyFatMass: '', bmi: '', bmr: '',
        segLeanLArm: '', segLeanRArm: '', segLeanTrunk: '', segLeanLLeg: '', segLeanRLeg: '',
        segFatLArm: '', segFatRArm: '', segFatTrunk: '', segFatLLeg: '', segFatRLeg: '',
    });

    const updateForm = (key, value) => {
        const newForm = { ...form, [key]: value };
        const w = parseFloat(newForm.weight);

        // Auto-fill: if muscle mass updated, re-compute body fat mass (and vice versa)
        if (key === 'muscleMass' && w > 0 && value !== '') {
            const mm = parseFloat(value);
            if (!isNaN(mm) && mm < w) {
                newForm.bodyFatMass = (w - mm).toFixed(1);
                newForm.fat = ((w - mm) / w * 100).toFixed(1);
            }
        }
        if (key === 'bodyFatMass' && w > 0 && value !== '') {
            const fm = parseFloat(value);
            if (!isNaN(fm) && fm < w) {
                newForm.muscleMass = (w - fm).toFixed(1);
                newForm.fat = (fm / w * 100).toFixed(1);
            }
        }
        if (key === 'weight' && value !== '') {
            const wNew = parseFloat(value);
            // Recalculate BMI
            if (settings.height > 0) {
                newForm.bmi = (wNew / ((settings.height / 100) ** 2)).toFixed(1);
            }
        }

        setForm(newForm);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!form.weight) return;
        addMetric({
            date: form.date,
            weight: parseFloat(form.weight) || 0, fat: parseFloat(form.fat) || 0,
            muscleMass: parseFloat(form.muscleMass) || 0, bodyFatMass: parseFloat(form.bodyFatMass) || 0,
            bmi: parseFloat(form.bmi) || 0, bmr: parseFloat(form.bmr) || 0,
            segLeanLArm: parseFloat(form.segLeanLArm) || 0, segLeanRArm: parseFloat(form.segLeanRArm) || 0,
            segLeanTrunk: parseFloat(form.segLeanTrunk) || 0, segLeanLLeg: parseFloat(form.segLeanLLeg) || 0, segLeanRLeg: parseFloat(form.segLeanRLeg) || 0,
            segFatLArm: parseFloat(form.segFatLArm) || 0, segFatRArm: parseFloat(form.segFatRArm) || 0,
            segFatTrunk: parseFloat(form.segFatTrunk) || 0, segFatLLeg: parseFloat(form.segFatLLeg) || 0, segFatRLeg: parseFloat(form.segFatRLeg) || 0,
        });
        setForm({
            date: getToday(), weight: '', fat: '', muscleMass: '', bodyFatMass: '', bmi: '', bmr: '',
            segLeanLArm: '', segLeanRArm: '', segLeanTrunk: '', segLeanLLeg: '', segLeanRLeg: '',
            segFatLArm: '', segFatRArm: '', segFatTrunk: '', segFatLLeg: '', segFatRLeg: '',
        });
        setShowForm(false);
    };

    const sorted = useMemo(() => [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date)), [metrics]);

    // Chart data for analytics
    const chartData = useMemo(() => {
        const filtered = filterByTime([...metrics].sort((a, b) => new Date(a.date) - new Date(b.date)), 'date', analyticFilter);
        return filtered.map(m => ({
            date: m.date.substring(5), // MM-DD
            weight: m.weight, fat: m.fat, muscleMass: m.muscleMass, bodyFatMass: m.bodyFatMass,
            bmi: m.bmi, bmr: m.bmr
        }));
    }, [metrics, analyticFilter]);

    const latestMetric = sorted[0];

    return (
        <div className="pb-24 animate-fade-in">
            <div className="tab-bar mb-5">
                {['log', 'history', 'analytics'].map(tab => (
                    <button key={tab} onClick={() => setSubTab(tab)}
                        className={subTab === tab ? 'tab-active' : 'tab'}>
                        {tab === 'log' ? 'Overview' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {subTab === 'log' && (
                <div className="space-y-5">

                    {/* Latest Scan Summary */}
                    {latestMetric && (
                        <div className="card-elevated">
                            <SectionHeader icon={Scale} title="Latest Scan" iconColor="text-accent-cyan" />
                            <p className="text-[10px] text-slate-600 -mt-3 mb-3">{latestMetric.date}</p>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-navy-900 p-2.5 rounded-xl text-center">
                                    <p className="text-[9px] font-bold text-slate-600 uppercase">Weight</p>
                                    <p className="text-lg font-black text-white">{latestMetric.weight}<span className="text-xs text-slate-500"> kg</span></p>
                                </div>
                                <div className="bg-navy-900 p-2.5 rounded-xl text-center">
                                    <p className="text-[9px] font-bold text-slate-600 uppercase">Muscle</p>
                                    <p className="text-lg font-black text-accent-green">{latestMetric.muscleMass || '--'}<span className="text-xs text-slate-500"> kg</span></p>
                                </div>
                                <div className="bg-navy-900 p-2.5 rounded-xl text-center">
                                    <p className="text-[9px] font-bold text-slate-600 uppercase">Fat</p>
                                    <p className="text-lg font-black text-accent-red">{latestMetric.fat || '--'}<span className="text-xs text-slate-500">%</span></p>
                                </div>
                            </div>

                            {/* Body Diagram Toggle */}
                            {(latestMetric.segLeanTrunk > 0 || latestMetric.segFatTrunk > 0) && (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={() => setSegMode('lean')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl ${segMode === 'lean' ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' : 'bg-navy-900 text-slate-500 border border-navy-600/20'}`}>
                                            Lean Mass
                                        </button>
                                        <button onClick={() => setSegMode('fat')}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl ${segMode === 'fat' ? 'bg-accent-red/20 text-accent-red border border-accent-red/30' : 'bg-navy-900 text-slate-500 border border-navy-600/20'}`}>
                                            Fat Mass
                                        </button>
                                    </div>
                                    <BodyDiagram
                                        segLean={{
                                            lArm: latestMetric.segLeanLArm, rArm: latestMetric.segLeanRArm,
                                            trunk: latestMetric.segLeanTrunk, lLeg: latestMetric.segLeanLLeg, rLeg: latestMetric.segLeanRLeg
                                        }}
                                        segFat={{
                                            lArm: latestMetric.segFatLArm, rArm: latestMetric.segFatRArm,
                                            trunk: latestMetric.segFatTrunk, lLeg: latestMetric.segFatLLeg, rLeg: latestMetric.segFatRLeg
                                        }}
                                        mode={segMode}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* New Scan Form */}
                    {!showForm ? (
                        <button onClick={() => setShowForm(true)} className="btn-primary w-full">
                            <PlusCircle className="w-4 h-4 mr-2" /> Log New Scan
                        </button>
                    ) : (
                        <form onSubmit={handleSave} className="card-elevated space-y-4 animate-scale-in">
                            <h3 className="font-bold text-white">InBody Scan</h3>
                            <input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} className="input" />

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="section-label">Weight (kg)</label>
                                    <input type="number" step="0.1" value={form.weight} onChange={e => updateForm('weight', e.target.value)} className="input !font-bold" required />
                                </div>
                                <div>
                                    <label className="section-label">Muscle (kg)</label>
                                    <input type="number" step="0.1" value={form.muscleMass} onChange={e => updateForm('muscleMass', e.target.value)} className="input !font-bold !text-accent-green" />
                                </div>
                                <div>
                                    <label className="section-label">Fat Mass (kg)</label>
                                    <input type="number" step="0.1" value={form.bodyFatMass} onChange={e => updateForm('bodyFatMass', e.target.value)} className="input !font-bold !text-accent-red" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="section-label">Body Fat %</label>
                                    <input type="number" step="0.1" value={form.fat} onChange={e => updateForm('fat', e.target.value)} className="input !text-sm" />
                                </div>
                                <div>
                                    <label className="section-label">BMI</label>
                                    <input type="number" step="0.1" value={form.bmi} onChange={e => updateForm('bmi', e.target.value)} className="input !text-sm" />
                                </div>
                                <div>
                                    <label className="section-label">BMR (kcal)</label>
                                    <input type="number" value={form.bmr} onChange={e => updateForm('bmr', e.target.value)} className="input !text-sm" />
                                </div>
                            </div>

                            {/* Segmental Lean */}
                            <div className="border-t border-navy-600/20 pt-3">
                                <p className="section-label !text-accent-green mb-2">Segmental Lean Mass (kg)</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { key: 'segLeanLArm', label: 'L Arm' },
                                        { key: 'segLeanRArm', label: 'R Arm' },
                                        { key: 'segLeanTrunk', label: 'Trunk' },
                                        { key: 'segLeanLLeg', label: 'L Leg' },
                                        { key: 'segLeanRLeg', label: 'R Leg' },
                                    ].map(item => (
                                        <div key={item.key}>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase block text-center">{item.label}</span>
                                            <input type="number" step="0.1" value={form[item.key]} onChange={e => updateForm(item.key, e.target.value)}
                                                className="input !text-xs !p-2 text-center !text-accent-green" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Segmental Fat */}
                            <div className="border-t border-navy-600/20 pt-3">
                                <p className="section-label !text-accent-red mb-2">Segmental Fat Mass (kg)</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {[
                                        { key: 'segFatLArm', label: 'L Arm' },
                                        { key: 'segFatRArm', label: 'R Arm' },
                                        { key: 'segFatTrunk', label: 'Trunk' },
                                        { key: 'segFatLLeg', label: 'L Leg' },
                                        { key: 'segFatRLeg', label: 'R Leg' },
                                    ].map(item => (
                                        <div key={item.key}>
                                            <span className="text-[8px] font-bold text-slate-600 uppercase block text-center">{item.label}</span>
                                            <input type="number" step="0.1" value={form[item.key]} onChange={e => updateForm(item.key, e.target.value)}
                                                className="input !text-xs !p-2 text-center !text-accent-red" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1 font-black">Save Scan</button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {subTab === 'history' && (
                <div className="space-y-3">
                    <h2 className="text-xl font-black text-white mb-4">Scan History</h2>
                    {sorted.length === 0 ? (
                        <p className="text-slate-600 text-center py-8">No scans recorded yet.</p>
                    ) : (
                        sorted.map((m, idx) => {
                            const prevMetric = sorted[idx + 1];
                            const weightChange = prevMetric ? (m.weight - prevMetric.weight).toFixed(1) : null;
                            const isExpanded = expandedDate === m.date;

                            return (
                                <div key={m.date} className="card !p-0 overflow-hidden">
                                    <button onClick={() => setExpandedDate(isExpanded ? null : m.date)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-navy-700/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-navy-900 rounded-xl p-2.5">
                                                <Scale className="w-4 h-4 text-accent-cyan" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-white text-sm">{m.date}</p>
                                                <p className="text-xs text-slate-500">
                                                    {m.weight}kg · {m.fat}% fat
                                                    {weightChange && (
                                                        <span className={`ml-2 font-bold ${parseFloat(weightChange) <= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                                            {weightChange > 0 ? '+' : ''}{weightChange}kg
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isExpanded && (
                                        <div className="border-t border-navy-600/20 p-4 space-y-3 animate-fade-in">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-navy-900 p-2 rounded-lg">
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase">Muscle</p>
                                                    <p className="text-sm font-black text-accent-green">{m.muscleMass || '--'} kg</p>
                                                </div>
                                                <div className="bg-navy-900 p-2 rounded-lg">
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase">Fat Mass</p>
                                                    <p className="text-sm font-black text-accent-red">{m.bodyFatMass || '--'} kg</p>
                                                </div>
                                                <div className="bg-navy-900 p-2 rounded-lg">
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase">BMI / BMR</p>
                                                    <p className="text-sm font-black text-white">{m.bmi || '--'} <span className="text-[9px] text-slate-500">/ {m.bmr || '--'}</span></p>
                                                </div>
                                            </div>
                                            {m.segLeanTrunk > 0 && (
                                                <BodyDiagram
                                                    segLean={{ lArm: m.segLeanLArm, rArm: m.segLeanRArm, trunk: m.segLeanTrunk, lLeg: m.segLeanLLeg, rLeg: m.segLeanRLeg }}
                                                    segFat={{ lArm: m.segFatLArm, rArm: m.segFatRArm, trunk: m.segFatTrunk, lLeg: m.segFatLLeg, rLeg: m.segFatRLeg }}
                                                    mode={segMode}
                                                />
                                            )}
                                            <button onClick={() => { if (confirm('Delete this scan?')) deleteMetric(m.date); }}
                                                className="btn-ghost w-full text-accent-red !text-xs flex items-center justify-center gap-1">
                                                <Trash2 className="w-3 h-3" /> Delete Scan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── ANALYTICS TAB ── */}
            {subTab === 'analytics' && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white">Analytics</h2>
                        <TimeFilter value={analyticFilter} onChange={setAnalyticFilter} />
                    </div>

                    {/* Weight + Composition Chart */}
                    <div className="card-elevated">
                        <SectionHeader icon={Activity} title="Weight & Composition" iconColor="text-accent-blue" />
                        {chartData.length > 0 ? (
                            <div className="h-60 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                                        <Line type="monotone" dataKey="weight" name="Weight" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="muscleMass" name="Muscle" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} />
                                        <Line type="monotone" dataKey="bodyFatMass" name="Fat Mass" stroke="#f43f5e" strokeWidth={2} dot={{ r: 2.5 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-600 py-6 text-sm">No composition data logged yet.</p>
                        )}
                    </div>

                    {/* Body Fat % Chart */}
                    <div className="card-elevated">
                        <SectionHeader icon={Target} title="Body Fat %" iconColor="text-accent-red" />
                        {chartData.length > 0 ? (
                            <div className="h-48 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Line type="monotone" dataKey="fat" name="Body Fat %" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-600 py-6 text-sm">No body fat data logged yet.</p>
                        )}
                    </div>

                    {/* BMI + BMR Chart */}
                    <div className="card-elevated">
                        <SectionHeader icon={Activity} title="BMI & BMR Trends" iconColor="text-accent-purple" />
                        {chartData.length > 0 ? (
                            <div className="h-56 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <YAxis yAxisId="bmi" domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="bmr" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                                        <Line yAxisId="bmi" type="monotone" dataKey="bmi" name="BMI" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6' }} connectNulls />
                                        <Line yAxisId="bmr" type="monotone" dataKey="bmr" name="BMR (kcal)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2.5, fill: '#f59e0b' }} connectNulls />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-600 py-6 text-sm">No BMI/BMR data logged yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BodyTab;
