import { useState, useEffect, useRef, useCallback } from 'react';

// Myzone HR Zones based on % of max HR
const ZONES = [
    { name: 'Grey', min: 0, max: 49, color: '#6b7280', bg: 'bg-gray-500', glow: 'rgba(107,114,128,0.3)' },
    { name: 'Blue', min: 50, max: 59, color: '#3b82f6', bg: 'bg-accent-blue', glow: 'rgba(59,130,246,0.3)' },
    { name: 'Green', min: 60, max: 69, color: '#10b981', bg: 'bg-accent-green', glow: 'rgba(16,185,129,0.3)' },
    { name: 'Yellow', min: 70, max: 79, color: '#f59e0b', bg: 'bg-accent-amber', glow: 'rgba(245,158,11,0.3)' },
    { name: 'Red', min: 80, max: 100, color: '#f43f5e', bg: 'bg-accent-red', glow: 'rgba(244,63,94,0.3)' },
];

const getZone = (hr, maxHR) => {
    if (!hr || !maxHR) return ZONES[0];
    const pct = Math.round((hr / maxHR) * 100);
    return ZONES.find(z => pct >= z.min && pct <= z.max) || ZONES[4];
};

// Standard HR calorie formula (Keytel et al.)
const calcCalPerMin = (hr, weightKg, age, isMale = true) => {
    if (!hr || hr < 40) return 0;
    if (isMale) {
        return Math.max(0, (-55.0969 + 0.6309 * hr + 0.1988 * weightKg + 0.2017 * age) / 4.184);
    }
    return Math.max(0, (-20.4022 + 0.4472 * hr - 0.1263 * weightKg + 0.074 * age) / 4.184);
};

/**
 * useMyzone — BLE heart rate monitor hook with demo fallback.
 *
 * @param {object} opts
 * @param {number} opts.age        User age for max HR calc
 * @param {number} opts.weightKg   User weight for calorie calc
 * @param {boolean} opts.enabled   Whether Myzone is enabled in settings
 * @returns {{ heartRate, caloriesBurned, zone, isConnected, isDemoMode, sessionSeconds, connect, disconnect, resetSession }}
 */
export function useMyzone({ age = 30, weightKg = 90, enabled = false }) {
    const [heartRate, setHeartRate] = useState(0);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    const deviceRef = useRef(null);
    const charRef = useRef(null);
    const demoIntervalRef = useRef(null);
    const calAccRef = useRef(0);

    const maxHR = 220 - (age || 30);
    const zone = getZone(heartRate, maxHR);

    // Session timer
    useEffect(() => {
        if (!isConnected) return;
        const timer = setInterval(() => setSessionSeconds(s => s + 1), 1000);
        return () => clearInterval(timer);
    }, [isConnected]);

    // Calorie accumulator — runs every second when connected
    useEffect(() => {
        if (!isConnected || heartRate < 40) return;
        const timer = setInterval(() => {
            const calPerSec = calcCalPerMin(heartRate, weightKg, age) / 60;
            calAccRef.current += calPerSec;
            setCaloriesBurned(Math.round(calAccRef.current));
        }, 1000);
        return () => clearInterval(timer);
    }, [isConnected, heartRate, weightKg, age]);

    // Handle BLE heart rate notification
    const handleHRNotification = useCallback((event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        // Bit 0 = 0: HR is uint8, Bit 0 = 1: HR is uint16
        const hr = (flags & 0x01) ? value.getUint16(1, true) : value.getUint8(1);
        setHeartRate(hr);
    }, []);

    // Connect to real BLE device
    const connectBLE = useCallback(async () => {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['heart_rate'] }],
                optionalServices: ['heart_rate'],
            });
            deviceRef.current = device;

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('heart_rate');
            const char = await service.getCharacteristic('heart_rate_measurement');
            charRef.current = char;

            await char.startNotifications();
            char.addEventListener('characteristicvaluechanged', handleHRNotification);

            device.addEventListener('gattserverdisconnected', () => {
                setIsConnected(false);
                setHeartRate(0);
            });

            setIsConnected(true);
            setIsDemoMode(false);
            calAccRef.current = 0;
            setCaloriesBurned(0);
            setSessionSeconds(0);
        } catch (err) {
            console.warn('BLE connection failed, falling back to demo mode:', err.message);
            startDemo();
        }
    }, [handleHRNotification]);

    // Demo mode — simulated HR for testing
    const startDemo = useCallback(() => {
        setIsDemoMode(true);
        setIsConnected(true);
        calAccRef.current = 0;
        setCaloriesBurned(0);
        setSessionSeconds(0);

        let baseHR = 72;
        let direction = 1;
        demoIntervalRef.current = setInterval(() => {
            // Simulate a workout HR pattern
            baseHR += direction * (Math.random() * 3);
            if (baseHR > 165) direction = -1;
            if (baseHR < 68) direction = 1;
            setHeartRate(Math.round(baseHR));
        }, 2000);
    }, []);

    // Connect handler — tries BLE first, falls back to demo
    const connect = useCallback(() => {
        if (navigator.bluetooth) {
            connectBLE();
        } else {
            startDemo();
        }
    }, [connectBLE, startDemo]);

    // Disconnect handler
    const disconnect = useCallback(() => {
        if (demoIntervalRef.current) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
        }
        if (charRef.current) {
            try {
                charRef.current.removeEventListener('characteristicvaluechanged', handleHRNotification);
                charRef.current.stopNotifications();
            } catch (e) { /* ignore */ }
            charRef.current = null;
        }
        if (deviceRef.current?.gatt?.connected) {
            deviceRef.current.gatt.disconnect();
        }
        deviceRef.current = null;
        setIsConnected(false);
        setIsDemoMode(false);
        setHeartRate(0);
    }, [handleHRNotification]);

    const resetSession = useCallback(() => {
        calAccRef.current = 0;
        setCaloriesBurned(0);
        setSessionSeconds(0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
            disconnect();
        };
    }, [disconnect]);

    return {
        heartRate,
        caloriesBurned,
        zone,
        isConnected,
        isDemoMode,
        sessionSeconds,
        maxHR,
        hrPercent: maxHR > 0 ? Math.round((heartRate / maxHR) * 100) : 0,
        connect,
        disconnect,
        resetSession,
    };
}
