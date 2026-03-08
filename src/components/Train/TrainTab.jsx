import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Play, Save, Plus, Copy, Trash2, CheckCircle2, Square, TrendingUp,
    Timer, Dumbbell, ChevronRight, Edit3, Trophy, X, AlertCircle,
    Heart, Zap, Radio, Bluetooth, BluetoothOff, Pause, RotateCcw, Volume2,
    ArrowUp, ArrowDown, StickyNote, Clock, Link, Bed
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getCategoryIcon, CATEGORY_COLORS, BottomSheet, EmptyState, TimeFilter, SectionHeader, ConfirmDialog, MediaRenderer } from '../ui/SharedComponents';
import { getToday, generateId, formatTimer, estimated1RM, filterByTime } from '../../utils/helpers';
import { ROUTINE_CATEGORIES } from '../../data/defaults';
import { useMyzone } from '../../hooks/useMyzone';
import { useTimer } from '../../hooks/useLocalStorage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid #243049', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0' }
};

// Category emojis
const CAT_EMOJI = { weight: '🏋️', cardio: '🫀', mobility: '🧘' };
const ROUTINE_CAT_EMOJI = { 'Strength': '💪', 'Conditioning': '🔥', 'Recovery': '🧘', 'Other': '📋' };

// ══════════════════════════════════════════════
// ACTIVE SESSION
// ══════════════════════════════════════════════
const ActiveSession = () => {
    const { exercises, settings, dailyDraft, setDailyDraft, addLogs, getPreviousLog, latestWeight, toggleRestDay, isRestDay } = useApp();
    const [workoutDate, setWorkoutDate] = useState(getToday);
    const [showSelector, setShowSelector] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [restTimer, setRestTimer] = useState(0);
    const [restTimerRunning, setRestTimerRunning] = useState(false);
    const [restTimerDefault, setRestTimerDefault] = useState(0);
    const [sessionNotes, setSessionNotes] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const restAudioRef = useRef(null);
    const sessionTimer = useTimer();

    // Myzone BLE hook
    const myzone = useMyzone({
        age: settings.age || 30,
        weightKg: latestWeight || 90,
        enabled: settings.myzoneConnected,
    });

    // Session statistics
    const sessionStats = useMemo(() => {
        const total = dailyDraft.length;
        const completed = dailyDraft.filter(i => i.completed).length;
        let totalVolume = 0;
        let bestE1RM = { value: 0, name: '' };

        dailyDraft.forEach(item => {
            const ex = exercises.find(e => e.id === item.exerciseId);
            if (!ex || !item.value) return;
            const val = parseFloat(item.value) || 0;
            const reps = parseInt(item.reps) || 0;

            if (ex.category === 'weight' && reps > 0) {
                totalVolume += val * reps;
                const e1rm = estimated1RM(val, reps);
                if (e1rm > bestE1RM.value) bestE1RM = { value: e1rm, name: ex.name };
            }
        });

        return { total, completed, totalVolume: Math.round(totalVolume), bestE1RM };
    }, [dailyDraft, exercises]);

    // Rest timer countdown
    useEffect(() => {
        if (!restTimerRunning || restTimer <= 0) return;
        const interval = setInterval(() => {
            setRestTimer(prev => {
                if (prev <= 1) {
                    setRestTimerRunning(false);
                    // Beep notification
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 880;
                        gain.gain.value = 0.3;
                        osc.start();
                        osc.stop(ctx.currentTime + 0.3);
                        setTimeout(() => {
                            const osc2 = ctx.createOscillator();
                            osc2.connect(gain);
                            osc2.frequency.value = 1100;
                            osc2.start();
                            osc2.stop(ctx.currentTime + 0.3);
                        }, 350);
                    } catch (e) { /* AudioContext not available */ }
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [restTimerRunning, restTimer]);

    // Start rest timer after completing a set
    const startRestTimer = useCallback((exercise) => {
        const defaults = settings.restTimerDefaults || { strength: 180, hypertrophy: 90, cardio: 60, mobility: 30 };
        const cat = exercise?.category || 'weight';
        const seconds = cat === 'weight' ? defaults.strength : cat === 'cardio' ? defaults.cardio : defaults.mobility;
        setRestTimerDefault(seconds);
        setRestTimer(seconds);
        setRestTimerRunning(true);
    }, [settings]);

    const updateItem = (tempId, updates) => {
        setDailyDraft(prev => prev.map(item => {
            if (item.tempId !== tempId) return item;
            const updated = { ...item, ...updates };
            const ex = exercises.find(e => e.id === item.exerciseId);

            // Clear validation error when field is filled
            if (validationErrors[tempId] && ex && isComplete(updated, ex)) {
                setValidationErrors(prev => { const n = { ...prev }; delete n[tempId]; return n; });
            }

            // Auto-complete: once all required info is filled AND timer has been used (started & stopped)
            if (ex && !updated.completed && !updated.timerRunning && updated.timerSeconds > 0 && isComplete(updated, ex)) {
                updated.completed = true;
                updated.timerRunning = false;
                // Trigger rest timer
                setTimeout(() => startRestTimer(ex), 0);
            }

            return updated;
        }));
    };

    // Check if all required fields are filled
    const isComplete = (item, ex) => {
        if (!item.value || item.value === '') return false;
        if (!item.rpe || parseInt(item.rpe) < 1 || parseInt(item.rpe) > 10) return false;
        // Reps required for weight exercises
        if (ex.category === 'weight' && (!item.reps || item.reps === '')) return false;
        return true;
    };

    const tryComplete = (item, ex) => {
        const errors = {};
        if (!item.value || parseFloat(item.value) <= 0) errors[item.tempId] = `Enter ${ex.unit} value`;
        else if (ex.category === 'weight' && !item.reps) errors[item.tempId] = 'Enter reps';
        else if (!item.rpe || parseInt(item.rpe) < 1) errors[item.tempId] = 'Rate effort (RPE 1-10)';

        if (Object.keys(errors).length > 0) {
            setValidationErrors(prev => ({ ...prev, ...errors }));
            return;
        }
        updateItem(item.tempId, { completed: true, timerRunning: false });
        // Auto-start rest timer between sets
        startRestTimer(ex);
    };

    const toggleTimer = (item, ex) => {
        if (item.timerRunning) {
            const isTimeBased = ex.unit === 'sec' || ex.unit === 'min';
            let autoValue = item.value;
            if (isTimeBased && item.timerSeconds > 0) {
                autoValue = ex.unit === 'sec' ? item.timerSeconds : (item.timerSeconds / 60).toFixed(1);
            }
            const updated = { timerRunning: false, value: autoValue };
            // After stopping timer, auto-complete ONLY if all info is filled
            const merged = { ...item, ...updated };
            if (isComplete(merged, ex)) {
                updated.completed = true;
            }
            updateItem(item.tempId, updated);
        } else {
            updateItem(item.tempId, { timerRunning: true });
        }
    };

    const addToDraft = (exId) => {
        setDailyDraft(prev => [...prev, {
            tempId: generateId(), exerciseId: exId, supersetId: generateId(),
            value: '', reps: '', meps: '', rpe: '',
            completed: false, timerRunning: false, timerSeconds: 0
        }]);
        setShowSelector(false);
    };

    const duplicateItem = (item) => {
        setDailyDraft(prev => [...prev, {
            ...item, tempId: generateId(), supersetId: item.supersetId || generateId(),
            completed: false, timerRunning: false, timerSeconds: 0
        }]);
    };

    const toggleSuperset = (idx) => {
        setDailyDraft(prev => {
            const arr = [...prev];
            const curr = arr[idx];
            const next = arr[idx + 1];
            if (!next) return prev;

            if (curr.supersetId && curr.supersetId === next.supersetId) {
                // Break link
                next.supersetId = generateId();
            } else {
                // Form link
                const sId = curr.supersetId || generateId();
                curr.supersetId = sId;
                next.supersetId = sId;
            }
            return arr;
        });
    };

    const saveWorkout = () => {
        const completed = dailyDraft.filter(item => item.completed && item.value);
        if (completed.length === 0) return alert('Complete at least one set with a value before saving.');

        const sessionId = generateId();
        const newLogs = completed.map(item => ({
            id: generateId(), date: workoutDate, exerciseId: item.exerciseId,
            value: parseFloat(item.value) || 0, reps: item.reps || '',
            meps: parseInt(item.meps) || 0, rpe: parseInt(item.rpe) || 0,
            restTime: restTimerDefault || 0,
            sessionId, supersetId: item.supersetId || generateId(),
            notes: sessionNotes || '',
        }));
        addLogs(newLogs);
        setDailyDraft(prev => prev.filter(item => !item.completed));
        setSessionNotes('');
        sessionTimer.reset();
        if (navigator.vibrate) navigator.vibrate(200);
    };

    // Move exercise up/down in draft (UI 2: reorder)
    const moveItem = (tempId, direction) => {
        setDailyDraft(prev => {
            const idx = prev.findIndex(i => i.tempId === tempId);
            if (idx < 0) return prev;
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= prev.length) return prev;
            const arr = [...prev];
            [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
            return arr;
        });
    };

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDailyDraft(draft => {
                if (!draft.some(item => item.timerRunning)) return draft;
                return draft.map(item => item.timerRunning ? { ...item, timerSeconds: (item.timerSeconds || 0) + 1 } : item);
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [setDailyDraft]);

    const exercisesByCategory = {
        weight: exercises.filter(e => e.category === 'weight'),
        cardio: exercises.filter(e => e.category === 'cardio'),
        mobility: exercises.filter(e => e.category === 'mobility'),
    };

    const fmtSessionTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const ZONE_CLASS = {
        Grey: 'zone-grey', Blue: 'zone-blue', Green: 'zone-green', Yellow: 'zone-yellow', Red: 'zone-red'
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-white">Active Session</h2>
                    {dailyDraft.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-navy-700 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                            <span className="text-sm font-black text-accent-cyan font-mono">{sessionTimer.formatted}</span>
                            {!sessionTimer.isRunning ? (
                                <button onClick={sessionTimer.start} className="btn-icon !p-0.5 text-accent-cyan"><Play className="w-3 h-3" /></button>
                            ) : (
                                <button onClick={sessionTimer.stop} className="btn-icon !p-0.5 text-slate-400"><Pause className="w-3 h-3" /></button>
                            )}
                        </div>
                    )}
                </div>
                <input type="date" value={workoutDate} onChange={e => setWorkoutDate(e.target.value)}
                    className="input !w-auto !py-1.5 !px-3 !text-sm !font-bold" />
            </div>

            {/* ── Myzone Live Banner ── */}
            {settings.myzoneConnected && (
                <div className={`mb-4 rounded-2xl overflow-hidden transition-all duration-500 ${ZONE_CLASS[myzone.zone.name] || 'zone-grey'} ${myzone.isConnected ? 'animate-zone-glow' : ''}`}>
                    {!myzone.isConnected ? (
                        /* Connect State */
                        <button
                            onClick={myzone.connect}
                            className="w-full bg-navy-800 border border-navy-600/30 rounded-2xl p-4 flex items-center justify-center gap-3 hover:border-accent-red/30 transition-all active:scale-[0.98]"
                        >
                            <Bluetooth className="w-5 h-5 text-accent-red" />
                            <span className="font-bold text-slate-300">Connect Myzone</span>
                            <Radio className="w-4 h-4 text-accent-red/50 animate-pulse" />
                        </button>
                    ) : (
                        /* Live Data State */
                        <div className="bg-navy-800/90 border border-navy-600/30 rounded-2xl p-4">
                            {/* Top Row: HR + Zone + Disconnect */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Heart
                                            className="w-8 h-8 animate-heartbeat"
                                            style={{ color: myzone.zone.color, fill: myzone.zone.color }}
                                        />
                                        <div
                                            className="absolute inset-0 rounded-full blur-md opacity-40"
                                            style={{ backgroundColor: myzone.zone.color }}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black font-mono" style={{ color: myzone.zone.color }}>
                                                {myzone.heartRate}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500">BPM</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                                                style={{
                                                    backgroundColor: myzone.zone.color + '20',
                                                    color: myzone.zone.color,
                                                    border: `1px solid ${myzone.zone.color}30`
                                                }}
                                            >
                                                {myzone.zone.name} Zone
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500">{myzone.hrPercent}% max</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={myzone.disconnect}
                                    className="btn-icon !p-2 text-slate-500 hover:!text-accent-red"
                                    title="Disconnect"
                                >
                                    <BluetoothOff className="w-4 h-4" />
                                </button>
                            </div>

                            {/* HR Zone Bar */}
                            <div className="flex gap-1 mb-3 h-2 rounded-full overflow-hidden bg-navy-900">
                                {['Grey', 'Blue', 'Green', 'Yellow', 'Red'].map(z => (
                                    <div
                                        key={z}
                                        className={`flex-1 rounded-full transition-all duration-300 ${myzone.zone.name === z ? 'opacity-100 scale-y-125' : 'opacity-20'
                                            }`}
                                        style={{ backgroundColor: { Grey: '#6b7280', Blue: '#3b82f6', Green: '#10b981', Yellow: '#f59e0b', Red: '#f43f5e' }[z] }}
                                    />
                                ))}
                            </div>

                            {/* Bottom Row: Calories + Session Time + MEPs */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-navy-900 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                        <Zap className="w-3 h-3 text-orange-400" />
                                        <span className="text-[9px] font-bold text-slate-600 uppercase">Burned</span>
                                    </div>
                                    <p className="text-lg font-black text-orange-400 font-mono">{myzone.caloriesBurned}</p>
                                    <p className="text-[9px] text-slate-600">kcal</p>
                                </div>
                                <div className="bg-navy-900 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                        <Timer className="w-3 h-3 text-accent-blue" />
                                        <span className="text-[9px] font-bold text-slate-600 uppercase">Session</span>
                                    </div>
                                    <p className="text-lg font-black text-accent-blue font-mono">{fmtSessionTime(myzone.sessionSeconds)}</p>
                                    <p className="text-[9px] text-slate-600">elapsed</p>
                                </div>
                                <div className="bg-navy-900 rounded-xl p-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1 mb-0.5">
                                        <Radio className="w-3 h-3 text-accent-red" />
                                        <span className="text-[9px] font-bold text-slate-600 uppercase">MEPs</span>
                                    </div>
                                    <p className="text-lg font-black text-accent-red font-mono">
                                        {Math.round(myzone.caloriesBurned * 0.8)}
                                    </p>
                                    <p className="text-[9px] text-slate-600">effort pts</p>
                                </div>
                            </div>

                            {/* Demo Mode Indicator */}
                            {myzone.isDemoMode && (
                                <p className="text-center text-[9px] text-slate-600 mt-2 italic">
                                    Demo Mode — BLE not available
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {dailyDraft.length === 0 ? (
                <div className="space-y-3">
                    <EmptyState
                        icon={isRestDay(workoutDate) ? Bed : Dumbbell}
                        title={isRestDay(workoutDate) ? "Rest Day" : "No exercises loaded"}
                        subtitle={isRestDay(workoutDate) ? "Enjoy your recovery!" : "Load a routine or add an exercise."}>
                        <div className="flex flex-col gap-3 w-full mt-2">
                            <button onClick={() => setShowSelector(true)} className="btn-primary w-full">+ Add Exercise</button>
                            <button onClick={() => toggleRestDay(workoutDate)} className={`btn-ghost w-full flex items-center justify-center gap-2 ${isRestDay(workoutDate) ? 'text-accent-red hover:bg-accent-red/10 !border-accent-red/30' : 'text-slate-500 !border-navy-600/50'}`}>
                                <Bed className="w-4 h-4" /> {isRestDay(workoutDate) ? "Unmark Rest Day" : "Mark as Rest Day"}
                            </button>
                        </div>
                    </EmptyState>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* ── Session Progress Bar ── */}
                    {sessionStats.total > 0 && (
                        <div className="card !py-3 !px-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-accent-amber" />
                                    <span className="text-xs font-bold text-slate-400">Session Progress</span>
                                </div>
                                <span className="text-xs font-black text-white">
                                    {sessionStats.completed}<span className="text-slate-500">/{sessionStats.total}</span> sets
                                </span>
                            </div>
                            <div className="progress-bar !h-2.5">
                                <div
                                    className={`progress-fill ${sessionStats.completed === sessionStats.total && sessionStats.total > 0 ? 'bg-accent-green' : 'bg-accent-blue'}`}
                                    style={{ width: `${sessionStats.total > 0 ? (sessionStats.completed / sessionStats.total) * 100 : 0}%` }}
                                />
                            </div>
                            {/* Volume + e1RM stats */}
                            <div className="flex items-center gap-4 mt-2.5">
                                {sessionStats.totalVolume > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <Dumbbell className="w-3 h-3 text-accent-blue" />
                                        <span className="text-[10px] font-bold text-slate-500">Volume:</span>
                                        <span className="text-xs font-black text-accent-blue">{sessionStats.totalVolume.toLocaleString()} kg</span>
                                    </div>
                                )}
                                {sessionStats.bestE1RM.value > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="w-3 h-3 text-accent-amber" />
                                        <span className="text-[10px] font-bold text-slate-500">Best e1RM:</span>
                                        <span className="text-xs font-black text-accent-amber">{sessionStats.bestE1RM.value} kg</span>
                                        <span className="text-[9px] text-slate-600">({sessionStats.bestE1RM.name})</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Rest Timer Banner ── */}
                    {(restTimerRunning || restTimer > 0) && (
                        <div className={`card !py-3 !px-4 border-accent-amber/30 bg-accent-amber/5 transition-all ${restTimer <= 5 && restTimer > 0 ? 'animate-pulse' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Timer className={`w-5 h-5 ${restTimer <= 10 ? 'text-accent-red' : 'text-accent-amber'}`} />
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Rest Timer</p>
                                        <p className={`text-2xl font-black font-mono ${restTimer <= 0 ? 'text-accent-green' :
                                            restTimer <= 10 ? 'text-accent-red' :
                                                'text-accent-amber'
                                            }`}>
                                            {restTimer <= 0 ? 'GO!' : fmtSessionTime(restTimer)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    {restTimer > 0 && (
                                        <>
                                            <button
                                                onClick={() => setRestTimer(prev => Math.max(0, prev - 30))}
                                                className="btn-icon !p-1.5 text-slate-400"
                                                title="-30s"
                                            >
                                                <span className="text-[10px] font-black">-30</span>
                                            </button>
                                            <button
                                                onClick={() => setRestTimer(prev => prev + 30)}
                                                className="btn-icon !p-1.5 text-slate-400"
                                                title="+30s"
                                            >
                                                <span className="text-[10px] font-black">+30</span>
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => { setRestTimerRunning(false); setRestTimer(0); }}
                                        className="btn-icon !p-1.5 text-accent-red"
                                        title="Skip"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {/* Rest timer progress bar */}
                            {restTimerDefault > 0 && restTimer > 0 && (
                                <div className="progress-bar mt-2 !h-1.5">
                                    <div
                                        className={`progress-fill transition-all duration-1000 ease-linear ${restTimer <= 10 ? 'bg-accent-red' : 'bg-accent-amber'
                                            }`}
                                        style={{ width: `${(restTimer / restTimerDefault) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {dailyDraft.map((item, idx) => {
                        const ex = exercises.find(e => e.id === item.exerciseId);
                        if (!ex) return null;
                        const prevLog = getPreviousLog(ex.id);
                        const isPR = item.completed && item.value && prevLog && parseFloat(item.value) > prevLog.value;
                        const error = validationErrors[item.tempId];
                        // Estimated 1RM for this set
                        const itemE1RM = ex.category === 'weight' && item.value && item.reps
                            ? estimated1RM(parseFloat(item.value), parseInt(item.reps))
                            : null;

                        const prevDraft = idx > 0 ? dailyDraft[idx - 1] : null;
                        const nextDraft = idx < dailyDraft.length - 1 ? dailyDraft[idx + 1] : null;
                        const isLinkedNext = nextDraft && nextDraft.supersetId && item.supersetId && nextDraft.supersetId === item.supersetId;
                        const isLinkedPrev = prevDraft && prevDraft.supersetId && item.supersetId && prevDraft.supersetId === item.supersetId;

                        return (
                            <React.Fragment key={item.tempId}>
                                <div className={`card transition-all duration-300 ${item.completed ? 'border-accent-green/40 bg-accent-green/5' :
                                    error ? 'border-accent-red/40 bg-accent-red/5' :
                                        item.timerRunning ? 'border-accent-red/40 bg-accent-red/5 animate-glow' : ''
                                    } ${isLinkedNext ? '!rounded-b-none !mb-0 border-b-0' : ''} ${isLinkedPrev ? '!rounded-t-none !mt-0' : ''}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-start gap-2">
                                            <button onClick={() => item.completed ? updateItem(item.tempId, { completed: false }) : toggleTimer(item, ex)} className="mt-0.5 active:scale-90 transition-transform">
                                                {item.completed ? <CheckCircle2 className="w-7 h-7 text-accent-green" /> :
                                                    item.timerRunning ? <Square className="w-7 h-7 text-accent-red fill-current animate-pulse" /> :
                                                        <Play className="w-7 h-7 text-accent-blue fill-current" />}
                                            </button>
                                            <div>
                                                <h4 className={`font-bold text-base leading-tight ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                                    {CAT_EMOJI[ex.category] || ''} {ex.name}
                                                    {isPR && <span className="ml-2 text-accent-amber text-xs">🔥 PR!</span>}
                                                </h4>
                                                {item.timerRunning ? (
                                                    <span className="timer-display">{formatTimer(item.timerSeconds)}</span>
                                                ) : (
                                                    <div className="flex flex-col gap-1 mt-1">
                                                        {prevLog && !item.completed && (
                                                            <p className="text-[10px] text-accent-green/60 font-bold flex items-center gap-1">
                                                                <TrendingUp className="w-3 h-3" /> Last: {prevLog.value}{ex.unit} {prevLog.reps ? `× ${prevLog.reps}` : ''} RPE: {prevLog.rpe || '?'}
                                                            </p>
                                                        )}
                                                        {itemE1RM && !item.completed && (
                                                            <span className="text-[10px] text-accent-purple font-bold">
                                                                Est. 1RM (1 Rep Max): {itemE1RM}kg
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {!item.completed && (
                                                <>
                                                    <button onClick={() => moveItem(item.tempId, -1)}
                                                        className="btn-icon !p-1" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                                                    <button onClick={() => moveItem(item.tempId, 1)}
                                                        className="btn-icon !p-1" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                                                </>
                                            )}
                                            {!item.completed && (
                                                <button onClick={() => tryComplete(item, ex)}
                                                    className="btn-icon !p-1.5 text-accent-green" title="Mark Complete"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                            )}
                                            <button onClick={() => duplicateItem(item)} className="btn-icon !p-1.5"><Copy className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setDailyDraft(prev => prev.filter(i => i.tempId !== item.tempId))}
                                                className="btn-icon !p-1.5 hover:!text-accent-red"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-1.5 mb-2 text-accent-red text-xs font-bold animate-fade-in">
                                            <AlertCircle className="w-3.5 h-3.5" /> {error}
                                        </div>
                                    )}

                                    <div className={`grid ${settings.myzoneConnected ? 'grid-cols-4' : 'grid-cols-3'} gap-2 ${item.completed ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <div className="relative">
                                            <input type="number" value={item.value || ''} onChange={e => updateItem(item.tempId, { value: e.target.value })}
                                                placeholder={prevLog ? prevLog.value.toString() : '0'}
                                                className={`input-lg !pr-8 ${error && !item.value ? '!border-accent-red/50' : ''}`} />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-600 uppercase">{ex.unit}</span>
                                        </div>
                                        <input type="text" value={item.reps || ''} onChange={e => updateItem(item.tempId, { reps: e.target.value })}
                                            placeholder={prevLog?.reps || 'Reps'} className={`input-lg !text-sm ${error && ex.category === 'weight' && !item.reps ? '!border-accent-red/50' : ''}`} />
                                        <input type="number" min="1" max="10" value={item.rpe || ''} onChange={e => updateItem(item.tempId, { rpe: e.target.value })}
                                            placeholder="RPE" className={`input-lg !text-sm ${error && (!item.rpe || parseInt(item.rpe) < 1) ? '!border-accent-red/50 !text-accent-red' : ''}`} />
                                        {settings.myzoneConnected && (
                                            <div className="relative">
                                                <input type="number" value={item.meps || ''} onChange={e => updateItem(item.tempId, { meps: e.target.value })}
                                                    placeholder="MEPs" className="input-lg !text-sm !text-accent-red !bg-accent-red/5 !border-accent-red/20" />
                                                <span className="absolute -top-1.5 right-1 text-[7px] font-bold text-accent-red/50 uppercase">Auto</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Superset Link UI */}
                                {idx < dailyDraft.length - 1 && (
                                    <div className="flex justify-center -my-3 relative z-10 opacity-60 hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => toggleSuperset(idx)}
                                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 transition-all ${isLinkedNext
                                                ? 'bg-navy-700 border border-accent-blue/50 text-accent-blue shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                                : 'bg-navy-900 border border-navy-600/50 text-slate-500'
                                                }`}
                                        >
                                            <Link className="w-3 h-3" /> {isLinkedNext ? 'Superset Linked' : 'Link Superset'}
                                        </button>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* ── Session Notes ── */}
                    <div className="card !py-3 !px-4">
                        <div className="flex items-center gap-2 mb-2">
                            <StickyNote className="w-3.5 h-3.5 text-accent-amber" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Session Notes</span>
                        </div>
                        <textarea
                            value={sessionNotes}
                            onChange={e => setSessionNotes(e.target.value)}
                            placeholder="How did it feel? Any pain? Notes for your trainer..."
                            className="input !text-sm !py-2 min-h-[60px] resize-none"
                            rows={2}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => setShowSelector(true)} className="btn-ghost flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Set
                        </button>
                        <button onClick={saveWorkout} className="btn-success flex items-center justify-center gap-2 font-black">
                            <Save className="w-4 h-4" /> Log Completed
                        </button>
                    </div>
                </div>
            )}

            {/* Exercise Selector — grouped by category with emojis */}
            <BottomSheet isOpen={showSelector} onClose={() => setShowSelector(false)} title="Select Exercise">
                <div className="space-y-5 pb-10">
                    {[
                        { key: 'weight', label: `${CAT_EMOJI.weight} Strength`, items: exercisesByCategory.weight },
                        { key: 'cardio', label: `${CAT_EMOJI.cardio} Cardio`, items: exercisesByCategory.cardio },
                        { key: 'mobility', label: `${CAT_EMOJI.mobility} Mobility`, items: exercisesByCategory.mobility },
                    ].filter(g => g.items.length > 0).map(group => (
                        <div key={group.key}>
                            <h4 className={`section-label mb-2 px-1 ${CATEGORY_COLORS[group.key]?.text}`}>
                                {group.label} ({group.items.length})
                            </h4>
                            <div className="space-y-2">
                                {group.items.map(ex => (
                                    <div key={ex.id} onClick={() => addToDraft(ex.id)}
                                        className="card-interactive flex items-center gap-3 !p-3">
                                        {ex.imgUrl ? (
                                            <MediaRenderer src={ex.imgUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${CATEGORY_COLORS[ex.category]?.bg}`}>
                                                {getCategoryIcon(ex.category, 'w-5 h-5')}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white leading-tight text-sm">{ex.name}</h4>
                                            <p className="text-[10px] text-slate-500 truncate">{ex.desc}</p>
                                        </div>
                                        <Plus className="w-5 h-5 text-accent-blue shrink-0" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </BottomSheet>
        </div>
    );
};

// ══════════════════════════════════════════════
// ROUTINES (with categories, emojis, and edit)
// ══════════════════════════════════════════════
const Routines = ({ onLoadRoutine }) => {
    const { exercises, routines, saveRoutine, deleteRoutine } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [editingRoutine, setEditingRoutine] = useState(null);
    const [form, setForm] = useState({ name: '', category: ROUTINE_CATEGORIES[0], exercises: [] });

    const openCreate = () => {
        setEditingRoutine(null);
        setForm({ name: '', category: ROUTINE_CATEGORIES[0], exercises: [] });
        setShowForm(true);
    };

    const openEdit = (routine) => {
        setEditingRoutine(routine);
        setForm({ name: routine.name, category: routine.category || ROUTINE_CATEGORIES[0], exercises: [...routine.exercises] });
        setShowForm(true);
        setExpanded(null);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!form.name || form.exercises.length === 0) return;
        if (editingRoutine) {
            // Update existing routine
            saveRoutine({ ...form, id: editingRoutine.id });
        } else {
            saveRoutine(form);
        }
        setForm({ name: '', category: ROUTINE_CATEGORIES[0], exercises: [] });
        setShowForm(false);
        setEditingRoutine(null);
    };

    const toggleEx = (exId) => {
        setForm(prev => ({
            ...prev,
            exercises: prev.exercises.includes(exId) ? prev.exercises.filter(id => id !== exId) : [...prev.exercises, exId]
        }));
    };

    const groupedRoutines = ROUTINE_CATEGORIES.map(cat => ({
        category: cat,
        items: routines.filter(r => r.category === cat)
    })).filter(g => g.items.length > 0);

    const uncategorized = routines.filter(r => !r.category || !ROUTINE_CATEGORIES.includes(r.category));
    if (uncategorized.length > 0) groupedRoutines.push({ category: 'Other', items: uncategorized });

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-white">Routines</h2>
                <button onClick={openCreate} className="btn-icon bg-accent-blue/10 text-accent-blue">
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="card-elevated mb-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white">{editingRoutine ? 'Edit Routine' : 'Create Routine'}</h3>
                        <button type="button" onClick={() => { setShowForm(false); setEditingRoutine(null); }} className="btn-icon"><X className="w-4 h-4" /></button>
                    </div>
                    <input placeholder="Routine Name" required value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} className="input font-bold" />
                    <div>
                        <p className="section-label mb-2">Category</p>
                        <div className="flex gap-2">
                            {ROUTINE_CATEGORIES.map(cat => (
                                <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })}
                                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${form.category === cat ? 'bg-accent-blue text-white' : 'bg-navy-900 text-slate-500 border border-navy-600/30'}`}>
                                    {ROUTINE_CAT_EMOJI[cat] || ''} {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {[
                            { key: 'weight', label: `${CAT_EMOJI.weight} Strength`, items: exercises.filter(e => e.category === 'weight') },
                            { key: 'cardio', label: `${CAT_EMOJI.cardio} Cardio`, items: exercises.filter(e => e.category === 'cardio') },
                            { key: 'mobility', label: `${CAT_EMOJI.mobility} Mobility`, items: exercises.filter(e => e.category === 'mobility') },
                        ].map(group => group.items.length > 0 && (
                            <div key={group.key}>
                                <p className={`section-label mb-1 ${CATEGORY_COLORS[group.key]?.text}`}>{group.label}</p>
                                {group.items.map(ex => (
                                    <label key={ex.id} className="flex items-center gap-3 p-2.5 bg-navy-900 rounded-xl cursor-pointer hover:bg-navy-700 transition-colors mb-1">
                                        <input type="checkbox" checked={form.exercises.includes(ex.id)} onChange={() => toggleEx(ex.id)}
                                            className="w-4 h-4 rounded border-navy-600 text-accent-blue focus:ring-accent-blue/30 bg-navy-800 cursor-pointer" />
                                        {ex.imgUrl ? (
                                            <MediaRenderer src={ex.imgUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                        ) : (
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[ex.category]?.bg}`}>
                                                {getCategoryIcon(ex.category, 'w-3.5 h-3.5')}
                                            </div>
                                        )}
                                        <span className="flex-1 font-bold text-slate-300 text-sm">{ex.name}</span>
                                    </label>
                                ))}
                            </div>
                        ))}
                    </div>
                    <button type="submit" disabled={form.exercises.length === 0} className="btn-primary w-full">
                        {editingRoutine ? 'Update Routine' : 'Save Routine'}
                    </button>
                </form>
            )}

            <div className="space-y-5">
                {groupedRoutines.map(group => (
                    <div key={group.category}>
                        <h3 className="section-label mb-3 px-1 text-accent-blue">
                            {ROUTINE_CAT_EMOJI[group.category] || '📋'} {group.category} ({group.items.length})
                        </h3>
                        <div className="space-y-3">
                            {group.items.map(routine => (
                                <div key={routine.id} className="card-interactive" onClick={() => setExpanded(expanded === routine.id ? null : routine.id)}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-white">
                                                {ROUTINE_CAT_EMOJI[routine.category] || ''} {routine.name}
                                            </h3>
                                            <p className="text-sm text-slate-500">{routine.exercises.length} exercises</p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${expanded === routine.id ? 'rotate-90' : ''}`} />
                                    </div>
                                    {expanded === routine.id && (
                                        <div className="mt-4 pt-4 border-t border-navy-600/20 animate-fade-in">
                                            <div className="space-y-2 mb-4">
                                                {routine.exercises.map(exId => {
                                                    const ex = exercises.find(e => e.id === exId);
                                                    return ex ? (
                                                        <div key={exId} className="flex items-center gap-2.5 text-sm text-slate-400 bg-navy-900 p-2.5 rounded-xl">
                                                            {ex.imgUrl ? (
                                                                <MediaRenderer src={ex.imgUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[ex.category]?.bg}`}>
                                                                    {getCategoryIcon(ex.category, 'w-3.5 h-3.5')}
                                                                </div>
                                                            )}
                                                            {CAT_EMOJI[ex.category] || ''} {ex.name}
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={e => { e.stopPropagation(); onLoadRoutine(routine); }}
                                                    className="flex-1 btn bg-accent-green/10 text-accent-green border border-accent-green/20 flex items-center justify-center gap-2">
                                                    <Play className="w-4 h-4 fill-current" /> Load
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); openEdit(routine); }}
                                                    className="btn bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); if (confirm('Delete this routine?')) deleteRoutine(routine.id); }}
                                                    className="btn bg-accent-red/10 text-accent-red border border-accent-red/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════
// EXERCISE LIBRARY
// ══════════════════════════════════════════════
const ExerciseLibrary = () => {
    const { exercises, logs, saveExercise, deleteExercise } = useApp();
    const [selectedId, setSelectedId] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [libFilter, setLibFilter] = useState('ALL');
    const [form, setForm] = useState({ name: '', category: 'weight', unit: 'kg', imgUrl: '', desc: '', notes: '' });

    const handleSave = (e) => {
        e.preventDefault();
        if (!form.name) return;
        saveExercise(form, editingId);
        setForm({ name: '', category: 'weight', unit: 'kg', imgUrl: '', desc: '', notes: '' });
        setShowAdd(false);
        setEditingId(null);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setForm({ ...form, imgUrl: reader.result });
            reader.readAsDataURL(file);
        }
    };

    const startEdit = (ex) => {
        setForm({ name: ex.name, category: ex.category, unit: ex.unit, imgUrl: ex.imgUrl || '', desc: ex.desc || '', notes: ex.notes || '' });
        setEditingId(ex.id);
        setSelectedId(null);
        setShowAdd(true);
    };

    const getExerciseData = (exId) => {
        const exLogs = logs.filter(l => l.exerciseId === exId).sort((a, b) => new Date(a.date) - new Date(b.date));
        const grouped = exLogs.reduce((acc, log) => {
            const ex = exercises.find(e => e.id === exId);
            if (!acc[log.date]) { acc[log.date] = { ...log }; }
            else {
                if (ex?.category === 'cardio') acc[log.date].value += log.value;
                else if (log.value > acc[log.date].value) acc[log.date] = { ...log };
            }
            return acc;
        }, {});
        return filterByTime(Object.values(grouped), 'date', libFilter);
    };

    if (selectedId) {
        const ex = exercises.find(e => e.id === selectedId);
        if (!ex) { setSelectedId(null); return null; }
        const chartData = getExerciseData(ex.id);
        const personalBest = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;

        return (
            <div className="space-y-5 animate-fade-in">
                <div className="flex justify-between items-center">
                    <button onClick={() => setSelectedId(null)} className="flex items-center gap-1 text-slate-500 font-bold text-sm">
                        <ChevronRight className="w-4 h-4 rotate-180" /> Library
                    </button>
                    <button onClick={() => startEdit(ex)} className="badge-blue cursor-pointer">
                        <Edit3 className="w-3 h-3" /> Edit
                    </button>
                </div>

                <div className="card-elevated relative overflow-hidden">
                    {ex.imgUrl && <MediaRenderer src={ex.imgUrl} className="absolute inset-0 w-full h-full object-cover opacity-[0.07]" alt="" />}
                    <div className="relative z-10">
                        <div className={`flex items-center gap-2 ${CATEGORY_COLORS[ex.category]?.text} mb-2`}>
                            {getCategoryIcon(ex.category, 'w-4 h-4')}
                            <span className="section-label">{CAT_EMOJI[ex.category]} {ex.category}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">{ex.name}</h2>
                        {ex.desc && <p className="text-accent-blue font-bold text-sm mb-3">{ex.desc}</p>}
                        {ex.notes && (
                            <div className="bg-navy-900 p-4 rounded-xl border border-navy-600/20 mt-3">
                                <p className="section-label mb-2">Trainer Notes</p>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{ex.notes}</p>
                            </div>
                        )}
                        {personalBest > 0 && (
                            <div className="mt-4 badge-amber inline-flex">
                                <Trophy className="w-3 h-3" /> PR: <span className="font-black ml-1">{personalBest} {ex.unit}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card-elevated">
                    <SectionHeader icon={TrendingUp} title="Progress" iconColor="text-accent-blue">
                        <TimeFilter value={libFilter} onChange={setLibFilter} />
                    </SectionHeader>
                    {chartData.length > 0 ? (
                        <div className="h-52 w-full -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} width={35} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip {...tooltipStyle} />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-center text-slate-600 py-8">No data logged.</p>
                    )}
                </div>

                <div className="space-y-2">
                    <h4 className="font-bold text-white px-1">Log History</h4>
                    {logs.filter(l => l.exerciseId === ex.id).sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => (
                        <div key={log.id} className="card flex justify-between items-center group !p-4">
                            <span className="text-slate-500 text-sm font-medium">{log.date}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-accent-green">
                                    {log.value} <span className="text-xs text-slate-500 font-normal">{ex.unit}</span>
                                    {log.reps && <span className="text-sm text-slate-400 ml-1 font-bold">× {log.reps}</span>}
                                </span>
                                {log.rpe > 0 && <span className="badge bg-navy-700 text-slate-400 border-navy-600/20">RPE {log.rpe}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const categories = [
        { key: 'weight', label: `${CAT_EMOJI.weight} Strength`, items: exercises.filter(e => e.category === 'weight') },
        { key: 'cardio', label: `${CAT_EMOJI.cardio} Cardio`, items: exercises.filter(e => e.category === 'cardio') },
        { key: 'mobility', label: `${CAT_EMOJI.mobility} Mobility`, items: exercises.filter(e => e.category === 'mobility') },
    ].filter(c => c.items.length > 0);

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-black text-white">Exercise Library</h2>
                <button onClick={() => { setForm({ name: '', category: 'weight', unit: 'kg', imgUrl: '', desc: '', notes: '' }); setEditingId(null); setShowAdd(true); }}
                    className="btn-icon bg-accent-blue/10 text-accent-blue"><Plus className="w-5 h-5" /></button>
            </div>

            {showAdd && (
                <form onSubmit={handleSave} className="card-elevated mb-6 space-y-3 animate-scale-in">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white">{editingId ? 'Edit Exercise' : 'Add Exercise'}</h3>
                        <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn-icon"><X className="w-4 h-4" /></button>
                    </div>
                    <input placeholder="Exercise Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input font-bold" />
                    <input placeholder="Description" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} className="input !text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input">
                            <option value="weight">Strength</option><option value="cardio">Cardio</option><option value="mobility">Mobility</option>
                        </select>
                        <input placeholder="Unit" required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input" />
                    </div>
                    <textarea placeholder="Trainer Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                        className="input !min-h-[70px] !text-sm resize-none" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="input !text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-accent-blue/10 file:text-accent-blue cursor-pointer" />
                    <div className="flex gap-2 pt-1">
                        {editingId && <button type="button" onClick={() => { if (confirm('Delete?')) { deleteExercise(editingId); setShowAdd(false); setEditingId(null); } }}
                            className="btn-danger !px-4"><Trash2 className="w-4 h-4" /></button>}
                        <button type="submit" className="btn-primary flex-1">{editingId ? 'Update' : 'Save'}</button>
                    </div>
                </form>
            )}

            <div className="space-y-5">
                {categories.map(cat => (
                    <div key={cat.key}>
                        <h3 className={`section-label mb-3 px-1 ${CATEGORY_COLORS[cat.key]?.text}`}>{cat.label} ({cat.items.length})</h3>
                        <div className="space-y-2">
                            {cat.items.map(ex => (
                                <div key={ex.id} onClick={() => setSelectedId(ex.id)} className="card-interactive flex items-center gap-3 !p-3.5">
                                    {ex.imgUrl ? (
                                        <MediaRenderer src={ex.imgUrl} alt="" className="w-14 h-14 rounded-xl object-cover" />
                                    ) : (
                                        <div className="w-14 h-14 bg-navy-900 rounded-xl flex items-center justify-center text-slate-600">
                                            {getCategoryIcon(ex.category, 'w-5 h-5')}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white leading-tight">{ex.name}</h3>
                                        <p className="text-xs text-slate-500 truncate">{ex.desc}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════
// TRAIN TAB (Container)
// ══════════════════════════════════════════════
const TrainTab = () => {
    const { setDailyDraft } = useApp();
    const [subTab, setSubTab] = useState('session');

    const loadRoutine = (routine) => {
        setDailyDraft(prev => [...prev, ...routine.exercises.map(exId => ({
            tempId: generateId(), exerciseId: exId,
            value: '', reps: '', meps: '', rpe: '',
            completed: false, timerRunning: false, timerSeconds: 0
        }))]);
        setSubTab('session');
    };

    return (
        <div className="pb-24 animate-fade-in">
            <div className="tab-bar mb-5">
                {['session', 'routines', 'library'].map(tab => (
                    <button key={tab} onClick={() => setSubTab(tab)}
                        className={subTab === tab ? 'tab-active' : 'tab'}>
                        {tab === 'session' ? 'Session' : tab === 'routines' ? 'Routines' : 'Library'}
                    </button>
                ))}
            </div>
            {subTab === 'session' && <ActiveSession />}
            {subTab === 'routines' && <Routines onLoadRoutine={loadRoutine} />}
            {subTab === 'library' && <ExerciseLibrary />}
        </div>
    );
};

export default TrainTab;
