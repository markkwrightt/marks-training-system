# Fitness Tracking PWA — Project Constitution

## Identity
**App Name:** Mark's Training System  
**Type:** Progressive Web App (React + Vite)  
**Deployment:** Vercel (auto-deploy from GitHub)  
**Theme:** Dark Navy (#0a0e1a) — refer to `Theme example.png`

## Data Schema

### Exercise
```json
{
  "id": "string",
  "name": "string",
  "category": "weight | cardio | mobility",
  "unit": "kg | min | sec | reps",
  "imgUrl": "string (URL or base64)",
  "desc": "string",
  "notes": "string"
}
```

### Workout Log
```json
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "exerciseId": "string",
  "value": "number",
  "reps": "string",
  "meps": "number",
  "rpe": "number (1-10)",
  "restTime": "number (seconds)",
  "sessionId": "string"
}
```

### Body Metric (InBody Scan)
```json
{
  "date": "YYYY-MM-DD",
  "weight": "number (kg)",
  "fat": "number (%)",
  "muscleMass": "number (kg)",
  "bodyFatMass": "number (kg)",
  "bmi": "number",
  "bmr": "number (kcal)",
  "segLean": { "lArm": 0, "rArm": 0, "trunk": 0, "lLeg": 0, "rLeg": 0 },
  "segFat": { "lArm": 0, "rArm": 0, "trunk": 0, "lLeg": 0, "rLeg": 0 }
}
```

### Nutrition Log
```json
{
  "id": "string",
  "date": "YYYY-MM-DD",
  "name": "string",
  "brand": "string",
  "servingAmount": "number (grams or servings)",
  "calories": "number",
  "protein": "number (g)",
  "carbs": "number (g)",
  "fat": "number (g)",
  "mealType": "breakfast | lunch | dinner | snack",
  "water": "number (ml)"
}
```

### Settings
```json
{
  "weeklyTarget": 3,
  "mainName": "string",
  "mainDate": "YYYY-MM-DD",
  "subName": "string",
  "subDate": "YYYY-MM-DD",
  "currentPhase": "Base Building | Functional Strength | Specific Prep | Expedition Ready",
  "height": 187,
  "nutritionTargets": { "calories": 2500, "protein": 180, "carbs": 220, "fat": 80 },
  "waterTarget": 3000,
  "myzoneConnected": false,
  "restTimerDefaults": { "strength": 180, "hypertrophy": 90, "cardio": 60, "mobility": 30 }
}
```

## Behavioral Rules
1. Data lives on-device (localStorage → future IndexedDB)
2. Export/Import JSON backups must always work
3. All calculations must be deterministic — no guessing at calories or MEPs
4. The app must work fully offline after initial load
5. Dark navy theme is the ONLY theme — no light mode toggle
6. Mobile-first design — 375px (iPhone SE) is the minimum viewport

## Architecture
- **Layer 1 (Architecture):** This file + `implementation_plan.md`
- **Layer 2 (Navigation):** React Context + tab-based routing
- **Layer 3 (Tools):** Vite build, PWA service worker, OpenFoodFacts API
