import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_EXERCISES, DEFAULT_ROUTINES, DEFAULT_SETTINGS, DEFAULT_METRICS, DEFAULT_LOGS, DEFAULT_NUTRITION_LOGS } from '../data/defaults';
import { getWeekStart, estimateCaloriesBurned, generateId } from '../utils/helpers';
import { getAutoImage } from '../utils/exerciseImages';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    // ── Persistent State ──
    const [exercises, setExercises] = useLocalStorage('mts_exercises', DEFAULT_EXERCISES);
    const [routines, setRoutines] = useLocalStorage('mts_routines', DEFAULT_ROUTINES);
    const [logs, setLogs] = useLocalStorage('mts_logs', DEFAULT_LOGS);
    const [metrics, setMetrics] = useLocalStorage('mts_metrics', DEFAULT_METRICS);
    const [nutritionLogs, setNutritionLogs] = useLocalStorage('mts_nutrition', DEFAULT_NUTRITION_LOGS);
    const [settings, setSettings] = useLocalStorage('mts_settings', DEFAULT_SETTINGS);
    const [dailyDraft, setDailyDraft] = useLocalStorage('mts_daily_draft', []);
    const [mealTemplates, setMealTemplates] = useLocalStorage('mts_meal_templates', []);
    const [sleepLogs, setSleepLogs] = useLocalStorage('mts_sleep_logs', []);
    const [restDays, setRestDays] = useLocalStorage('mts_rest_days', []);
    const [deletedHistory, setDeletedHistory] = useState([]); // Array of { type, item, timestamp }

    // ── Computed Stats ──
    const currentWeekLogs = useMemo(() => {
        const monday = getWeekStart();
        return logs.filter(log => new Date(log.date) >= monday);
    }, [logs]);

    const streak = useMemo(() =>
        new Set(currentWeekLogs.map(l => l.date)).size
        , [currentWeekLogs]);

    const weeklyMeps = useMemo(() =>
        currentWeekLogs.reduce((acc, l) => acc + (l.meps || 0), 0)
        , [currentWeekLogs]);

    const totalVolumes = useMemo(() => {
        let strength = 0, cardio = 0, mobility = 0, meps = 0;
        logs.forEach(log => {
            meps += (log.meps || 0);
            const ex = exercises.find(e => e.id === log.exerciseId);
            if (ex) {
                if (ex.category === 'weight') strength++;
                if (ex.category === 'cardio') cardio++;
                if (ex.category === 'mobility') mobility++;
            }
        });
        return { strength, cardio, mobility, meps, total: strength + cardio + mobility };
    }, [logs, exercises]);

    const latestMetric = useMemo(() => metrics[metrics.length - 1] || null, [metrics]);
    const latestWeight = latestMetric?.weight || 90;

    // ── Actions ──
    const saveExercise = useCallback((exerciseData, editingId = null) => {
        // Auto-assign image if none provided
        const data = { ...exerciseData };
        if (!data.imgUrl || data.imgUrl.trim() === '') {
            data.imgUrl = getAutoImage(data.name, data.category);
        }
        if (editingId) {
            setExercises(prev => prev.map(ex => ex.id === editingId ? { ...ex, ...data } : ex));
        } else {
            setExercises(prev => [...prev, { id: generateId(), ...data }]);
        }
    }, [setExercises]);

    const deleteExercise = useCallback((id) => {
        setExercises(prev => {
            const item = prev.find(ex => ex.id === id);
            if (item) setDeletedHistory(h => [...h, { type: 'exercise', item, timestamp: Date.now() }]);
            return prev.filter(ex => ex.id !== id);
        });
    }, [setExercises]);

    const saveRoutine = useCallback((routineData) => {
        if (routineData.id) {
            setRoutines(prev => prev.map(r => r.id === routineData.id ? { ...r, ...routineData } : r));
        } else {
            setRoutines(prev => [...prev, { id: generateId(), ...routineData }]);
        }
    }, [setRoutines]);

    const deleteRoutine = useCallback((id) => {
        setRoutines(prev => {
            const item = prev.find(r => r.id === id);
            if (item) setDeletedHistory(h => [...h, { type: 'routine', item, timestamp: Date.now() }]);
            return prev.filter(r => r.id !== id);
        });
    }, [setRoutines]);

    const addLogs = useCallback((newLogs) => {
        setLogs(prev => [...newLogs, ...prev]);
    }, [setLogs]);

    const deleteLog = useCallback((id) => {
        setLogs(prev => {
            const item = prev.find(l => l.id === id);
            if (item) setDeletedHistory(h => [...h, { type: 'log', item, timestamp: Date.now() }]);
            return prev.filter(l => l.id !== id);
        });
    }, [setLogs]);

    const addMetric = useCallback((metricData) => {
        setMetrics(prev => [...prev, metricData]);
    }, [setMetrics]);

    const deleteMetric = useCallback((dateStr) => {
        setMetrics(prev => {
            const item = prev.find(m => m.date === dateStr);
            if (item) setDeletedHistory(h => [...h, { type: 'metric', item, timestamp: Date.now() }]);
            return prev.filter(m => m.date !== dateStr);
        });
    }, [setMetrics]);

    const addNutritionLog = useCallback((logData) => {
        setNutritionLogs(prev => [logData, ...prev]);
    }, [setNutritionLogs]);

    const deleteNutritionLog = useCallback((id) => {
        setNutritionLogs(prev => {
            const item = prev.find(n => n.id === id);
            if (item) setDeletedHistory(h => [...h, { type: 'nutrition', item, timestamp: Date.now() }]);
            return prev.filter(n => n.id !== id);
        });
    }, [setNutritionLogs]);

    // ── Meal Templates ──
    const saveMealTemplate = useCallback((template) => {
        if (template.id) {
            setMealTemplates(prev => prev.map(t => t.id === template.id ? { ...t, ...template } : t));
        } else {
            setMealTemplates(prev => [...prev, { id: generateId(), ...template }]);
        }
    }, [setMealTemplates]);

    const deleteMealTemplate = useCallback((id) => {
        setMealTemplates(prev => prev.filter(t => t.id !== id));
    }, [setMealTemplates]);

    // ── Sleep Tracking ──
    const addSleepLog = useCallback((logData) => {
        setSleepLogs(prev => {
            const filtered = prev.filter(s => s.date !== logData.date);
            return [logData, ...filtered];
        });
    }, [setSleepLogs]);

    const deleteSleepLog = useCallback((date) => {
        setSleepLogs(prev => prev.filter(s => s.date !== date));
    }, [setSleepLogs]);

    // ── Rest Days ──
    const toggleRestDay = useCallback((dateStr) => {
        setRestDays(prev => {
            if (prev.includes(dateStr)) return prev.filter(d => d !== dateStr);
            return [...prev, dateStr];
        });
    }, [setRestDays]);

    const isRestDay = useCallback((dateStr) => {
        return restDays.includes(dateStr);
    }, [restDays]);

    // ── Undo Action ──
    const undoDelete = useCallback(() => {
        setDeletedHistory(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.type === 'exercise') setExercises(e => [...e, last.item]);
            if (last.type === 'routine') setRoutines(r => [...r, last.item]);
            if (last.type === 'log') setLogs(l => [...l, last.item]);
            if (last.type === 'metric') setMetrics(m => [...m, last.item]);
            if (last.type === 'nutrition') setNutritionLogs(n => [...n, last.item]);
            return prev.slice(0, -1);
        });
    }, [setExercises, setRoutines, setLogs, setMetrics, setNutritionLogs]);

    const calculateDailyBurn = useCallback((dateStr) => {
        const dayLogs = logs.filter(l => l.date === dateStr);
        return dayLogs.reduce((burn, log) => {
            const ex = exercises.find(e => e.id === log.exerciseId);
            return burn + estimateCaloriesBurned(log, ex, latestWeight);
        }, 0);
    }, [logs, exercises, latestWeight]);

    const getPreviousLog = useCallback((exId) => {
        const pastLogs = logs.filter(l => l.exerciseId === exId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return pastLogs.length > 0 ? pastLogs[0] : null;
    }, [logs]);

    // ── Data Import ──
    const importData = useCallback((data) => {
        if (data.settings) setSettings(data.settings);
        if (data.exercises) setExercises(data.exercises);
        if (data.routines) setRoutines(data.routines);
        if (data.logs) setLogs(data.logs);
        if (data.metrics) setMetrics(data.metrics);
        if (data.nutritionLogs) setNutritionLogs(data.nutritionLogs);
        if (data.mealTemplates) setMealTemplates(data.mealTemplates);
        if (data.sleepLogs) setSleepLogs(data.sleepLogs);
        if (data.restDays) setRestDays(data.restDays);
    }, [setSettings, setExercises, setRoutines, setLogs, setMetrics, setNutritionLogs, setMealTemplates, setSleepLogs, setRestDays]);

    const getAllData = useCallback(() => ({
        settings, exercises, routines, logs, metrics, nutritionLogs, mealTemplates, sleepLogs, restDays
    }), [settings, exercises, routines, logs, metrics, nutritionLogs, mealTemplates, sleepLogs, restDays]);

    const value = useMemo(() => ({
        // State
        exercises, routines, logs, metrics, nutritionLogs, settings, dailyDraft,
        mealTemplates, sleepLogs, restDays, deletedHistory,
        // Setters
        setSettings, setDailyDraft, setDeletedHistory,
        // Computed
        currentWeekLogs, streak, weeklyMeps, totalVolumes, latestMetric, latestWeight,
        // Actions
        saveExercise, deleteExercise,
        saveRoutine, deleteRoutine,
        addLogs, deleteLog,
        addMetric, deleteMetric,
        addNutritionLog, deleteNutritionLog,
        saveMealTemplate, deleteMealTemplate,
        addSleepLog, deleteSleepLog,
        toggleRestDay, isRestDay,
        undoDelete,
        calculateDailyBurn, getPreviousLog,
        importData, getAllData,
    }), [
        exercises, routines, logs, metrics, nutritionLogs, settings, dailyDraft,
        mealTemplates, sleepLogs, restDays, deletedHistory,
        setSettings, setDailyDraft, setDeletedHistory,
        currentWeekLogs, streak, weeklyMeps, totalVolumes, latestMetric, latestWeight,
        saveExercise, deleteExercise,
        saveRoutine, deleteRoutine,
        addLogs, deleteLog,
        addMetric, deleteMetric,
        addNutritionLog, deleteNutritionLog,
        saveMealTemplate, deleteMealTemplate,
        addSleepLog, deleteSleepLog,
        toggleRestDay, isRestDay,
        undoDelete,
        calculateDailyBurn, getPreviousLog,
        importData, getAllData,
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};
