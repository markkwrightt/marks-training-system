import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persistent state using localStorage.
 * Drop-in replacement for useState with automatic persistence.
 * Designed for future IndexedDB migration.
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.warn(`Error writing localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

/**
 * Timer hook for workout rest timers and session timers.
 */
export function useTimer(initialSeconds = 0) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        if (!isRunning) return;
        const interval = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    const start = useCallback(() => setIsRunning(true), []);
    const stop = useCallback(() => setIsRunning(false), []);
    const reset = useCallback(() => { setIsRunning(false); setSeconds(0); }, []);
    const toggle = useCallback(() => setIsRunning(r => !r), []);

    const formatted = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    return { seconds, isRunning, start, stop, reset, toggle, formatted };
}

/**
 * Countdown timer hook for rest timer between sets.
 */
export function useCountdown(initialSeconds = 0) {
    const [remaining, setRemaining] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setRemaining(initialSeconds);
        setIsComplete(false);
    }, [initialSeconds]);

    useEffect(() => {
        if (!isRunning || remaining <= 0) {
            if (isRunning && remaining <= 0) {
                setIsRunning(false);
                setIsComplete(true);
                // Vibrate if available (mobile)
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            }
            return;
        }
        const interval = setInterval(() => {
            setRemaining(r => r - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRunning, remaining]);

    const start = useCallback((secs) => {
        if (secs !== undefined) setRemaining(secs);
        setIsComplete(false);
        setIsRunning(true);
    }, []);
    const stop = useCallback(() => setIsRunning(false), []);
    const reset = useCallback(() => {
        setIsRunning(false);
        setRemaining(initialSeconds);
        setIsComplete(false);
    }, [initialSeconds]);

    const formatted = `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;

    return { remaining, isRunning, isComplete, start, stop, reset, formatted };
}
