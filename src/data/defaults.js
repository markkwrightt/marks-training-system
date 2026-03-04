// Default exercise library — seed data for new installs
export const DEFAULT_EXERCISES = [
    {
        id: 'e1', name: 'Weighted Step-ups', category: 'weight', unit: 'kg',
        imgUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=200&q=80',
        desc: 'Crucial for jungle inclines. Load a backpack.',
        notes: 'Keep torso upright. Drive through heel of the elevated foot. Step height should be at knee level.'
    },
    {
        id: 'e2', name: 'Zone 2 Walk/Ruck', category: 'cardio', unit: 'min',
        imgUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&q=80',
        desc: 'Maintain conversational pace to build aerobic base.',
        notes: 'Heart rate should stay in Zone 2 (120-140 bpm). Gradually increase load by 2.5kg per week.'
    },
    {
        id: 'e3', name: 'Plank', category: 'mobility', unit: 'sec',
        imgUrl: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=200&q=80',
        desc: 'Core stability for carrying heavy packs.',
        notes: 'Squeeze glutes, tuck pelvis. Breathe steadily. Add shoulder taps for progression.'
    },
    {
        id: 'e4', name: 'Goblet Squat', category: 'weight', unit: 'kg',
        imgUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=200&q=80',
        desc: 'Builds quad strength and hip mobility.',
        notes: 'Elbows inside knees at the bottom. Full depth. Pause 2 sec at bottom for mobility benefit.'
    },
    {
        id: 'e5', name: 'Deadlift', category: 'weight', unit: 'kg',
        imgUrl: 'https://images.unsplash.com/photo-1534368270820-9de3d8053204?w=200&q=80',
        desc: 'Posterior chain king — hamstrings, glutes, back.',
        notes: 'Brace core before lift. Bar stays close to shins. Hip hinge, not a back lift.'
    },
    {
        id: 'e6', name: 'Pull-ups', category: 'weight', unit: 'kg',
        imgUrl: 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=200&q=80',
        desc: 'Upper body pulling strength. Value = added weight (0 for bodyweight).',
        notes: 'Full dead hang at bottom. Chin over bar at top. Use band assist if needed.'
    },
    {
        id: 'e7', name: 'Running', category: 'cardio', unit: 'min',
        imgUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=200&q=80',
        desc: 'Aerobic capacity and endurance.',
        notes: 'Easy run at conversational pace. Nasal breathing preferred. 180 cadence target.'
    },
    {
        id: 'e8', name: 'Hip Flexor Stretch', category: 'mobility', unit: 'sec',
        imgUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&q=80',
        desc: 'Essential for desk workers and runners.',
        notes: 'Hold for 45-60 seconds each side. Squeeze opposite glute to deepen stretch.'
    },
    {
        id: 'e9', name: 'Bench Press', category: 'weight', unit: 'kg',
        imgUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
        desc: 'Chest, shoulders, triceps compound push.',
        notes: 'Retract scapulae, arch slightly. Bar touches lower chest. Drive feet into floor.'
    },
    {
        id: 'e10', name: 'Rowing Machine', category: 'cardio', unit: 'min',
        imgUrl: 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=200&q=80',
        desc: 'Full body low-impact cardio.',
        notes: 'Drive with legs first, then hinge, then arms. 24-28 strokes per minute for steady state.'
    },
    {
        id: 'e11', name: 'Thoracic Spine Rotation', category: 'mobility', unit: 'sec',
        imgUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&q=80',
        desc: 'Opens up upper back and improves rotation.',
        notes: 'Keep hips stacked. Reach through and up. 10 reps each side, hold top for 3 sec.'
    }
];

export const ROUTINE_CATEGORIES = ['Strength', 'Conditioning', 'Recovery'];

export const DEFAULT_ROUTINES = [
    { id: 'r1', name: 'Jungle Leg Prep', category: 'Strength', exercises: ['e1', 'e4', 'e5', 'e3'] },
    { id: 'r2', name: 'Active Recovery', category: 'Recovery', exercises: ['e2', 'e3', 'e8'] },
    { id: 'r3', name: 'Upper Body Strength', category: 'Strength', exercises: ['e6', 'e9', 'e5', 'e3'] },
    { id: 'r4', name: 'Cardio Endurance', category: 'Conditioning', exercises: ['e7', 'e10', 'e2'] },
    { id: 'r5', name: 'Full Mobility Flow', category: 'Recovery', exercises: ['e3', 'e8', 'e11'] },
];

export const DEFAULT_SETTINGS = {
    weeklyTarget: 3,
    mainName: 'Vietnam Jungle',
    mainDate: '2027-05-01',
    subName: 'Local Trial Hike',
    subDate: '2026-08-01',
    currentPhase: 'Base Building',
    height: 187,
    age: 30,
    nutritionTargets: { calories: 2500, protein: 180, carbs: 220, fat: 80 },
    waterTarget: 3000,
    myzoneConnected: false,
    restTimerDefaults: { strength: 180, hypertrophy: 90, cardio: 60, mobility: 30 },
    bodyCompStartDate: '', // '' means use first ever entry
};

// ── DUMMY TEST DATA ──
// This data will be cleared when the user starts using the app for real.
const today = new Date();
const days = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

export const DEFAULT_METRICS = [
    {
        date: days(90), weight: 118, fat: 35, muscleMass: 76.7, bodyFatMass: 41.3, bmi: 33.7, bmr: 2150,
        segLeanLArm: 3.8, segLeanRArm: 3.9, segLeanTrunk: 28.5, segLeanLLeg: 10.2, segLeanRLeg: 10.3,
        segFatLArm: 2.1, segFatRArm: 2.0, segFatTrunk: 18.5, segFatLLeg: 5.2, segFatRLeg: 5.1
    },
    {
        date: days(60), weight: 115, fat: 33, muscleMass: 77.1, bodyFatMass: 37.9, bmi: 32.9, bmr: 2170,
        segLeanLArm: 3.9, segLeanRArm: 4.0, segLeanTrunk: 28.8, segLeanLLeg: 10.3, segLeanRLeg: 10.4,
        segFatLArm: 1.9, segFatRArm: 1.8, segFatTrunk: 17.0, segFatLLeg: 4.8, segFatRLeg: 4.7
    },
    {
        date: days(30), weight: 112, fat: 30, muscleMass: 78.4, bodyFatMass: 33.6, bmi: 32.0, bmr: 2200,
        segLeanLArm: 4.0, segLeanRArm: 4.1, segLeanTrunk: 29.2, segLeanLLeg: 10.5, segLeanRLeg: 10.6,
        segFatLArm: 1.7, segFatRArm: 1.6, segFatTrunk: 15.5, segFatLLeg: 4.3, segFatRLeg: 4.2
    },
    {
        date: days(7), weight: 110, fat: 28, muscleMass: 79.2, bodyFatMass: 30.8, bmi: 31.4, bmr: 2230,
        segLeanLArm: 4.1, segLeanRArm: 4.2, segLeanTrunk: 29.5, segLeanLLeg: 10.7, segLeanRLeg: 10.8,
        segFatLArm: 1.5, segFatRArm: 1.4, segFatTrunk: 14.0, segFatLLeg: 3.9, segFatRLeg: 3.8
    },
];

export const DEFAULT_LOGS = [
    // Week 1 (recent)
    { id: 'l1', date: days(1), exerciseId: 'e1', value: 30, reps: '12', meps: 45, rpe: 7 },
    { id: 'l2', date: days(1), exerciseId: 'e4', value: 24, reps: '10', meps: 35, rpe: 6 },
    { id: 'l3', date: days(1), exerciseId: 'e5', value: 80, reps: '8', meps: 50, rpe: 8 },
    { id: 'l4', date: days(1), exerciseId: 'e3', value: 60, reps: '1', meps: 10, rpe: 5 },
    { id: 'l5', date: days(3), exerciseId: 'e7', value: 35, reps: '', meps: 80, rpe: 6 },
    { id: 'l6', date: days(3), exerciseId: 'e10', value: 20, reps: '', meps: 55, rpe: 7 },
    { id: 'l7', date: days(3), exerciseId: 'e8', value: 45, reps: '2', meps: 5, rpe: 3 },
    { id: 'l8', date: days(5), exerciseId: 'e6', value: 8, reps: '3', meps: 30, rpe: 8 },
    { id: 'l9', date: days(5), exerciseId: 'e9', value: 60, reps: '10', meps: 40, rpe: 7 },
    { id: 'l10', date: days(5), exerciseId: 'e11', value: 30, reps: '10', meps: 5, rpe: 3 },
    // Week 2
    { id: 'l11', date: days(8), exerciseId: 'e1', value: 28, reps: '12', meps: 42, rpe: 7 },
    { id: 'l12', date: days(8), exerciseId: 'e4', value: 22, reps: '10', meps: 32, rpe: 6 },
    { id: 'l13', date: days(10), exerciseId: 'e7', value: 30, reps: '', meps: 70, rpe: 5 },
    { id: 'l14', date: days(10), exerciseId: 'e2', value: 45, reps: '', meps: 60, rpe: 4 },
    { id: 'l15', date: days(12), exerciseId: 'e5', value: 75, reps: '8', meps: 45, rpe: 8 },
    { id: 'l16', date: days(12), exerciseId: 'e6', value: 7, reps: '3', meps: 28, rpe: 8 },
    // Week 3
    { id: 'l17', date: days(15), exerciseId: 'e1', value: 26, reps: '12', meps: 40, rpe: 6 },
    { id: 'l18', date: days(15), exerciseId: 'e3', value: 55, reps: '1', meps: 8, rpe: 5 },
    { id: 'l19', date: days(17), exerciseId: 'e10', value: 25, reps: '', meps: 60, rpe: 6 },
    { id: 'l20', date: days(19), exerciseId: 'e9', value: 55, reps: '10', meps: 38, rpe: 7 },
    // Older
    { id: 'l21', date: days(25), exerciseId: 'e5', value: 70, reps: '8', meps: 42, rpe: 7 },
    { id: 'l22', date: days(25), exerciseId: 'e1', value: 24, reps: '10', meps: 38, rpe: 6 },
    { id: 'l23', date: days(30), exerciseId: 'e7', value: 25, reps: '', meps: 55, rpe: 5 },
    { id: 'l24', date: days(35), exerciseId: 'e4', value: 20, reps: '10', meps: 30, rpe: 6 },
];

export const DEFAULT_NUTRITION_LOGS = [
    // Yesterday
    { id: 'n1', date: days(1), name: 'Greek Yogurt with Berries', brand: 'Chobani', servingAmount: 200, calories: 180, protein: 18, carbs: 15, fat: 5, mealType: 'breakfast' },
    { id: 'n2', date: days(1), name: 'Chicken Breast & Rice', brand: 'Home Cooked', servingAmount: 400, calories: 520, protein: 45, carbs: 55, fat: 10, mealType: 'lunch' },
    { id: 'n3', date: days(1), name: 'Protein Shake', brand: 'Optimum Nutrition', servingAmount: 350, calories: 220, protein: 30, carbs: 8, fat: 5, mealType: 'snack' },
    { id: 'n4', date: days(1), name: 'Salmon & Vegetables', brand: 'Home Cooked', servingAmount: 450, calories: 580, protein: 42, carbs: 25, fat: 28, mealType: 'dinner' },
    { id: 'n5', date: days(1), name: 'Banana', brand: 'Fresh', servingAmount: 120, calories: 105, protein: 1, carbs: 27, fat: 0, mealType: 'snack' },
    // 2 days ago
    { id: 'n6', date: days(2), name: 'Scrambled Eggs on Toast', brand: 'Home Cooked', servingAmount: 250, calories: 350, protein: 22, carbs: 28, fat: 16, mealType: 'breakfast' },
    { id: 'n7', date: days(2), name: 'Tuna Salad', brand: 'Subway', servingAmount: 350, calories: 420, protein: 35, carbs: 20, fat: 18, mealType: 'lunch' },
    { id: 'n8', date: days(2), name: 'Steak & Sweet Potato', brand: 'Home Cooked', servingAmount: 500, calories: 650, protein: 48, carbs: 45, fat: 22, mealType: 'dinner' },
    { id: 'n9', date: days(2), name: 'Almonds', brand: 'Kirkland', servingAmount: 30, calories: 170, protein: 6, carbs: 6, fat: 15, mealType: 'snack' },
    // 3 days ago
    { id: 'n10', date: days(3), name: 'Oatmeal with Honey', brand: 'Quaker', servingAmount: 300, calories: 280, protein: 8, carbs: 48, fat: 6, mealType: 'breakfast' },
    { id: 'n11', date: days(3), name: 'Grilled Chicken Wrap', brand: 'Home Cooked', servingAmount: 300, calories: 450, protein: 38, carbs: 35, fat: 14, mealType: 'lunch' },
    { id: 'n12', date: days(3), name: 'Pasta Bolognese', brand: 'Home Cooked', servingAmount: 450, calories: 580, protein: 32, carbs: 65, fat: 18, mealType: 'dinner' },
    // 5 days ago
    { id: 'n13', date: days(5), name: 'Smoothie Bowl', brand: 'Home Made', servingAmount: 400, calories: 320, protein: 15, carbs: 50, fat: 8, mealType: 'breakfast' },
    { id: 'n14', date: days(5), name: 'Chicken Caesar Salad', brand: 'Pret', servingAmount: 350, calories: 480, protein: 35, carbs: 15, fat: 28, mealType: 'lunch' },
    { id: 'n15', date: days(5), name: 'Fish & Chips', brand: 'Takeaway', servingAmount: 500, calories: 750, protein: 30, carbs: 65, fat: 38, mealType: 'dinner' },
    // Older entries
    { id: 'n16', date: days(8), name: 'Porridge', brand: 'Home Cooked', servingAmount: 250, calories: 260, protein: 10, carbs: 40, fat: 6, mealType: 'breakfast' },
    { id: 'n17', date: days(8), name: 'Turkey Sandwich', brand: 'Home Made', servingAmount: 300, calories: 380, protein: 28, carbs: 35, fat: 12, mealType: 'lunch' },
    { id: 'n18', date: days(8), name: 'Lamb Curry & Rice', brand: 'Home Cooked', servingAmount: 500, calories: 680, protein: 35, carbs: 70, fat: 25, mealType: 'dinner' },
    { id: 'n19', date: days(10), name: 'Eggs Benedict', brand: 'Café', servingAmount: 350, calories: 520, protein: 25, carbs: 30, fat: 30, mealType: 'breakfast' },
    { id: 'n20', date: days(10), name: 'Protein Bar', brand: 'Grenade', servingAmount: 60, calories: 220, protein: 20, carbs: 18, fat: 8, mealType: 'snack' },
];
