/**
 * Utility functions — deterministic calculations only.
 * No guessing at calories, MEPs, or body composition.
 */

// ── Time Filters ──
export const filterByTime = (data, dateKey, filterValue) => {
    if (filterValue === 'ALL') return data;
    const past = new Date();
    const offsets = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    if (offsets[filterValue]) past.setDate(past.getDate() - offsets[filterValue]);
    return data.filter(d => new Date(d[dateKey]) >= past);
};

// ── Date Utilities ──
export const daysUntil = (dateStr) =>
    Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)));

export const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const getWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// ── Training Phase ──
export const getPhase = (targetDateStr) => {
    const monthsLeft = (new Date(targetDateStr) - new Date()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsLeft > 12) return 'Base Building';
    if (monthsLeft > 6) return 'Functional Strength';
    if (monthsLeft > 0) return 'Specific Prep';
    return 'Expedition Ready';
};

export const PHASE_COLORS = {
    'Base Building': { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/20' },
    'Functional Strength': { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20' },
    'Specific Prep': { bg: 'bg-accent-amber/10', text: 'text-accent-amber', border: 'border-accent-amber/20' },
    'Expedition Ready': { bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/20' },
};

// ── Body Composition ──
export const getBodyMassStats = (metric) => {
    if (!metric) return { weight: 0, fatMass: 0, muscleMass: 0 };
    const fatMass = metric.bodyFatMass || (metric.fat ? (metric.weight * (metric.fat / 100)) : 0);
    const muscleMass = metric.muscleMass || (fatMass > 0 ? (metric.weight - fatMass) : 0);
    return { weight: metric.weight, fatMass, muscleMass };
};

// ── Calorie Burn Estimation (MET-based) ──
// MET values from Compendium of Physical Activities
const MET_VALUES = {
    weight: 6.0,    // Resistance training (moderate effort)
    cardio: 7.0,    // Walking/running (moderate)
    mobility: 2.5,  // Stretching/yoga
};

/**
 * Estimate calories burned for a single exercise log.
 * Formula: Calories = MET × weight(kg) × duration(hours)
 * This is a reasonable estimate — actual burn varies by individual.
 */
export const estimateCaloriesBurned = (log, exercise, bodyWeightKg = 90) => {
    if (!exercise) return 0;
    const met = MET_VALUES[exercise.category] || 3.0;

    let durationHours;
    if (exercise.unit === 'min') {
        durationHours = (log.value || 0) / 60;
    } else if (exercise.unit === 'sec') {
        durationHours = (log.value || 0) / 3600;
    } else {
        // Weight exercises: estimate ~2 min per set (value is weight, reps is set info)
        const sets = log.reps ? parseInt(log.reps) || 1 : 1;
        durationHours = (sets * 2) / 60;
    }

    return Math.round(met * bodyWeightKg * durationHours);
};

// ── Estimated 1RM (Epley Formula) ──
export const estimated1RM = (weight, reps) => {
    const r = parseInt(reps);
    if (!weight || !r || r <= 0) return 0;
    if (r === 1) return weight;
    return Math.round(weight * (1 + r / 30));
};

// ── Timer Formatting ──
export const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// ── Data Export/Import ──
export const exportData = (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTS_Backup_${getToday()}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

// ── ID Generator ──
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

// ── TDEE Calculation ──
// Activity multipliers from Mifflin-St Jeor research
const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
};

/**
 * Calculate Total Daily Energy Expenditure.
 * TDEE = BMR × activity multiplier + exercise burn
 */
export const calculateTDEE = (bmr, activityLevel = 'moderate', exerciseBurn = 0) => {
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.55;
    return Math.round((bmr * multiplier) + exerciseBurn);
};

// ── Format Short Date ──
export const formatShortDate = (dateStr) => {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
};
