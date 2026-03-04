/**
 * Auto-image mapping for exercises.
 * When a user creates an exercise without uploading an image,
 * we automatically assign a relevant Unsplash image based on
 * keyword matching or category fallback.
 */

// ── Keyword → Image Mapping ──
// Curated high-quality exercise images from Unsplash
const KEYWORD_IMAGES = {
    // Upper Body - Push
    'bench press': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
    'push up': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
    'pushup': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
    'overhead press': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
    'shoulder press': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
    'dip': 'https://images.unsplash.com/photo-1597347316205-36f6c451902a?w=400&q=80',
    'chest fly': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    'tricep': 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&q=80',

    // Upper Body - Pull
    'pull up': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
    'pullup': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
    'chin up': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
    'row': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
    'lat pulldown': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    'bicep curl': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',
    'curl': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80',

    // Lower Body
    'squat': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
    'deadlift': 'https://images.unsplash.com/photo-1534368270820-9de3d8053204?w=400&q=80',
    'lunge': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80',
    'leg press': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
    'step up': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80',
    'step-up': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80',
    'calf raise': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&q=80',
    'hamstring': 'https://images.unsplash.com/photo-1534368270820-9de3d8053204?w=400&q=80',
    'hip thrust': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',
    'glute': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80',

    // Core
    'plank': 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=400&q=80',
    'crunch': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    'sit up': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    'ab': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
    'core': 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?w=400&q=80',
    'russian twist': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',

    // Cardio
    'run': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80',
    'running': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80',
    'jog': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80',
    'sprint': 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80',
    'cycling': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
    'bike': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80',
    'swim': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80',
    'rowing': 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=400&q=80',
    'row machine': 'https://images.unsplash.com/photo-1519505907962-0a6cb0167c73?w=400&q=80',
    'walk': 'https://images.unsplash.com/photo-1551632811-561732d1e366?w=400&q=80',
    'ruck': 'https://images.unsplash.com/photo-1551632811-561732d1e366?w=400&q=80',
    'hike': 'https://images.unsplash.com/photo-1551632811-561732d1e366?w=400&q=80',
    'stair': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=400&q=80',
    'jump rope': 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80',
    'skipping': 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&q=80',
    'burpee': 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80',
    'kettlebell': 'https://images.unsplash.com/photo-1517344884509-a0c97ec11bbc?w=400&q=80',
    'battle rope': 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80',
    'box jump': 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80',

    // Mobility / Stretching
    'stretch': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    'yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    'foam roll': 'https://images.unsplash.com/photo-1570691079236-4bca6c45d440?w=400&q=80',
    'mobility': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    'flexibility': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    'hip flexor': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    'thoracic': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
    'pilates': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
    'band': 'https://images.unsplash.com/photo-1598971639058-cf72a3171899?w=400&q=80',
};

// ── Category Fallback Images ──
const CATEGORY_FALLBACKS = {
    weight: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
    cardio: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&q=80',
    mobility: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
};

/**
 * Get an auto-generated image URL for an exercise.
 * Matches by keyword first, then falls back to category default.
 *
 * @param {string} exerciseName - Name of the exercise
 * @param {string} category - Exercise category (weight, cardio, mobility)
 * @returns {string} Unsplash image URL
 */
export const getAutoImage = (exerciseName, category = 'weight') => {
    const name = (exerciseName || '').toLowerCase().trim();

    // Try keyword matching (longest match first for specificity)
    const keywords = Object.keys(KEYWORD_IMAGES).sort((a, b) => b.length - a.length);
    for (const keyword of keywords) {
        if (name.includes(keyword)) {
            return KEYWORD_IMAGES[keyword];
        }
    }

    // Fallback to category default
    return CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.weight;
};
