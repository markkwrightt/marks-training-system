import React, { useState, useMemo } from 'react';
import {
    Activity, Scale, TrendingUp, Target, Settings as SettingsIcon,
    Radio, Flame, Apple, Calendar
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ComposedChart, Legend
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { daysUntil, getPhase, getBodyMassStats, filterByTime, PHASE_COLORS, getToday } from '../../utils/helpers';
import { TimeFilter, SectionHeader, StatCard } from '../ui/SharedComponents';

const Dashboard = ({ onOpenSettings }) => {
    const {
        settings, exercises, logs, metrics,
        streak, weeklyMeps, totalVolumes,
        currentWeekLogs, latestMetric, nutritionLogs
    } = useApp();

    const [dashFilter, setDashFilter] = useState('ALL');

    // Body composition changes — use bodyCompStartDate from settings
    const baselineMetric = useMemo(() => {
        if (settings.bodyCompStartDate) {
            return metrics.find(m => m.date === settings.bodyCompStartDate) || metrics[0];
        }
        return metrics[0];
    }, [metrics, settings.bodyCompStartDate]);

    const currentStats = getBodyMassStats(latestMetric);
    const baselineStats = getBodyMassStats(baselineMetric);
    const changes = {
        weight: (currentStats.weight - baselineStats.weight).toFixed(1),
        fatMass: (currentStats.fatMass - baselineStats.fatMass).toFixed(1),
        muscleMass: (currentStats.muscleMass - baselineStats.muscleMass).toFixed(1),
    };

    // Weekly adherence — training + nutrition only
    const adherence = useMemo(() => {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);

        const trainingDays = new Set(currentWeekLogs.map(l => l.date)).size;
        const trainingPct = Math.min(100, Math.round((trainingDays / settings.weeklyTarget) * 100));

        const nutDays = new Set(nutritionLogs.filter(n => new Date(n.date) >= weekStart).map(n => n.date)).size;
        const nutritionPct = Math.round((nutDays / 7) * 100);

        return { trainingDays, trainingPct, nutDays, nutritionPct };
    }, [currentWeekLogs, nutritionLogs, settings]);

    // Composed chart data
    const composedChartData = useMemo(() => {
        const dataMap = {};
        metrics.forEach(m => {
            const stats = getBodyMassStats(m);
            dataMap[m.date] = {
                date: m.date, weight: stats.weight,
                fatMass: stats.fatMass || null,
                muscleMass: stats.muscleMass || null, meps: 0
            };
        });
        logs.forEach(l => {
            if (!dataMap[l.date]) dataMap[l.date] = { date: l.date, meps: 0 };
            dataMap[l.date].meps += (l.meps || 0);
            const ex = exercises.find(e => e.id === l.exerciseId);
            if (ex) {
                const catKey = ex.category === 'weight' ? 'strengthCount' : ex.category + 'Count';
                dataMap[l.date][catKey] = (dataMap[l.date][catKey] || 0) + 1;
            }
        });
        return filterByTime(
            Object.values(dataMap).sort((a, b) => new Date(a.date) - new Date(b.date)),
            'date', dashFilter
        );
    }, [metrics, logs, exercises, dashFilter]);

    // Heatmap data: Last 30 days
    const heatmapDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }, []);

    const heatmapData = useMemo(() => {
        const map = {};
        heatmapDays.forEach(d => {
            const dayLogs = logs.filter(l => l.date === d);
            const intensityVal = settings.myzoneConnected
                ? dayLogs.reduce((acc, l) => acc + (l.meps || 0), 0)
                : dayLogs.length; // fallback
            map[d] = intensityVal;
        });
        const maxVal = Math.max(1, ...Object.values(map));
        return heatmapDays.map(d => ({
            date: d,
            value: map[d],
            intensity: map[d] === 0 ? 0 : Math.max(1, Math.min(4, Math.ceil((map[d] / maxVal) * 4)))
        }));
    }, [heatmapDays, logs, settings.myzoneConnected]);

    const phaseColors = PHASE_COLORS[settings.currentPhase || getPhase(settings.mainDate)] || PHASE_COLORS['Base Building'];

    const tooltipStyle = {
        contentStyle: {
            background: '#111827', border: '1px solid #243049',
            borderRadius: '12px', fontSize: '12px', color: '#e2e8f0'
        }
    };

    return (
        <div className="space-y-5 pb-24 animate-fade-in">
            {/* Target Cards */}
            <div className="relative">
                <button
                    onClick={onOpenSettings}
                    className="absolute right-3 top-3 z-20 bg-black/30 p-2 rounded-xl text-white/70 hover:text-white hover:bg-black/50 transition-all"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>

                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-900/30 relative overflow-hidden">
                    <Target className="absolute -right-6 -top-6 w-36 h-36 opacity-[0.07]" />
                    <div className="relative z-10">
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                            Main Target: {settings.mainName}
                        </p>
                        <h2 className="text-5xl font-black">
                            {daysUntil(settings.mainDate)}
                            <span className="text-lg font-medium opacity-60 ml-2">Days</span>
                        </h2>
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                            <span className={`badge ${phaseColors.bg} ${phaseColors.text} ${phaseColors.border}`}>
                                {settings.currentPhase || getPhase(settings.mainDate)}
                            </span>
                        </div>
                    </div>
                </div>

                {settings.subName ? (
                    <div className="bg-navy-700 rounded-2xl p-4 mt-3 border border-navy-600/30 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Milestone: {settings.subName}
                            </p>
                            <p className="text-sm font-bold text-slate-300">{getPhase(settings.subDate)}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white">{daysUntil(settings.subDate)}</span>
                            <span className="text-xs text-slate-500 ml-1">Days</span>
                        </div>
                    </div>
                ) : (
                    <button onClick={onOpenSettings}
                        className="w-full bg-navy-800 rounded-2xl p-4 mt-3 border-2 border-dashed border-navy-600/30 text-center text-slate-600 font-bold text-sm hover:border-accent-blue/30 transition-colors">
                        + Set a milestone target
                    </button>
                )}
            </div>

            {/* Weekly Pace — consolidated with Training + Nutrition adherence */}
            <div className="card-elevated">
                <div className="flex items-center gap-6 mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-accent-blue" />
                            <span className="section-label">Weekly Pace</span>
                        </div>
                        <p className="text-3xl font-black text-white">
                            {streak}<span className="text-lg text-slate-500 font-medium">/{settings.weeklyTarget}</span>
                        </p>
                        <p className="section-label">Resets Monday</p>
                    </div>
                    {settings.myzoneConnected && (
                        <div className="flex-1 border-l border-navy-600/20 pl-6">
                            <div className="flex items-center gap-2 mb-1">
                                <Radio className="w-4 h-4 text-accent-red" />
                                <span className="section-label">Weekly MEPs</span>
                            </div>
                            <p className="text-3xl font-black text-accent-red">{weeklyMeps}</p>
                            <p className="section-label">Effort Points</p>
                        </div>
                    )}
                </div>

                {/* Compact adherence bars — Training + Nutrition only */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-navy-900 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-accent-blue" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Training</span>
                            </div>
                            <span className="text-xs font-black text-white">{adherence.trainingDays}/{settings.weeklyTarget}</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill bg-accent-blue" style={{ width: `${adherence.trainingPct}%` }} />
                        </div>
                    </div>
                    <div className="bg-navy-900 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                                <Apple className="w-3 h-3 text-accent-green" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Nutrition</span>
                            </div>
                            <span className="text-xs font-black text-white">{adherence.nutDays}/7</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill bg-accent-green" style={{ width: `${adherence.nutritionPct}%` }} />
                        </div>
                    </div>
                </div>

                {/* All Time Volume */}
                <div className="bg-navy-900 rounded-xl p-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        <span className="section-label">All Time</span>
                        <span className="text-sm font-bold text-white ml-auto">{new Set(logs.map(l => l.date)).size} days</span>
                    </div>
                    <div className={`grid ${settings.myzoneConnected ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Strength</p>
                            <p className="text-lg font-black text-accent-green">{totalVolumes.strength}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Cardio</p>
                            <p className="text-lg font-black text-orange-500">{totalVolumes.cardio}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Mobility</p>
                            <p className="text-lg font-black text-accent-purple">{totalVolumes.mobility}</p>
                        </div>
                        {settings.myzoneConnected && (
                            <div className="text-center">
                                <p className="text-[9px] font-bold text-slate-600 uppercase">MEPs</p>
                                <p className="text-lg font-black text-accent-red">{totalVolumes.meps}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Training Heatmap */}
                <div className="bg-navy-900 rounded-xl p-3 mt-3">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-3.5 h-3.5 text-accent-green" />
                        <span className="section-label">30-Day Heatmap</span>
                    </div>
                    <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5 overflow-x-hidden pt-1">
                        {heatmapData.map((d) => {
                            const dayOfM = parseInt(d.date.slice(-2));
                            return (
                                <div key={d.date} className="flex flex-col gap-1 items-center justify-center">
                                    <span className={`text-[8px] font-bold ${d.date === getToday() ? 'text-accent-green' : 'text-slate-600'}`}>
                                        {dayOfM}
                                    </span>
                                    <div
                                        title={`${d.date}: ${d.value} ${settings.myzoneConnected ? 'MEPs' : 'sets'}`}
                                        className={`w-4 h-4 rounded-[4px] transition-colors ${d.intensity === 0 ? 'bg-navy-800 border border-navy-600/30' :
                                            d.intensity === 1 ? 'bg-accent-green/30 border border-accent-green/20' :
                                                d.intensity === 2 ? 'bg-accent-green/50 border border-accent-green/30' :
                                                    d.intensity === 3 ? 'bg-accent-green/80 border border-accent-green/50' :
                                                        'bg-accent-green border border-accent-green shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                            }`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Body Composition */}
            <div className="card-elevated">
                <SectionHeader icon={Scale} title="Body Composition" iconColor="text-accent-cyan" />
                <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Weight" value={currentStats.weight} unit="kg"
                        change={changes.weight} changePositive={changes.weight <= 0} />
                    <StatCard label="Muscle" value={currentStats.muscleMass > 0 ? currentStats.muscleMass.toFixed(1) : '--'} unit="kg"
                        change={currentStats.muscleMass > 0 ? changes.muscleMass : null} changePositive={changes.muscleMass >= 0} />
                    <StatCard label="Fat" value={currentStats.fatMass > 0 ? currentStats.fatMass.toFixed(1) : '--'} unit="kg"
                        change={currentStats.fatMass > 0 ? changes.fatMass : null} changePositive={changes.fatMass <= 0} />
                </div>
                {settings.bodyCompStartDate && (
                    <p className="text-[9px] text-slate-600 text-center mt-2">
                        Changes from: {settings.bodyCompStartDate}
                    </p>
                )}
            </div>

            {/* Progress Chart */}
            <div className="card-elevated">
                <SectionHeader icon={TrendingUp} title="Progress" iconColor="text-accent-green">
                    <TimeFilter value={dashFilter} onChange={setDashFilter} />
                </SectionHeader>
                <div className="h-72 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={composedChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                            <XAxis dataKey="date" tickFormatter={(v) => v.substring(5).replace('-', '/')} tick={{ fontSize: 9, fill: '#64748b' }} tickMargin={8} />
                            <YAxis yAxisId="left" domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip {...tooltipStyle} />
                            <Legend content={(props) => {
                                const { payload } = props;
                                const row1 = payload.filter(entry => ['Strength', 'Cardio', 'Mobility'].includes(entry.value));
                                const row2 = payload.filter(entry => ['Weight', 'Muscle', 'Fat'].includes(entry.value));
                                return (
                                    <div className="flex flex-col items-center gap-1.5 pt-3 text-[9px] text-slate-400">
                                        <div className="flex justify-center gap-3">
                                            {row1.map((entry, index) => (
                                                <div key={`item-r1-${index}`} className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                                                    <span>{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-center gap-3">
                                            {row2.map((entry, index) => (
                                                <div key={`item-r2-${index}`} className="flex items-center gap-1">
                                                    <div className="w-2 h-0.5" style={{ backgroundColor: entry.color }} />
                                                    <span>{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }} />
                            <Bar yAxisId="right" dataKey="strengthCount" name="Strength" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                            <Bar yAxisId="right" dataKey="cardioCount" name="Cardio" stackId="a" fill="#f97316" />
                            <Bar yAxisId="right" dataKey="mobilityCount" name="Mobility" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            <Line yAxisId="left" type="monotone" dataKey="weight" name="Weight" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                            <Line yAxisId="left" type="monotone" dataKey="muscleMass" name="Muscle" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                            <Line yAxisId="left" type="monotone" dataKey="fatMass" name="Fat" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
