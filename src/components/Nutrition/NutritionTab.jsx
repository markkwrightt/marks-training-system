import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Apple, Search, Plus, Trash2, Coffee, Utensils, Cookie, Drumstick, Droplets,
    Minus, Clock, X, BookOpen, Save, Copy, Barcode
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { getToday, generateId, filterByTime, calculateTDEE } from '../../utils/helpers';
import { TimeFilter, SectionHeader, MacroBar } from '../ui/SharedComponents';
import { Html5Qrcode } from 'html5-qrcode';

const tooltipStyle = {
    contentStyle: { background: '#111827', border: '1px solid #243049', borderRadius: '12px', fontSize: '12px', color: '#e2e8f0' }
};

const MEAL_TYPES = [
    { key: 'breakfast', label: 'Breakfast', icon: Coffee, color: 'text-amber-400' },
    { key: 'lunch', label: 'Lunch', icon: Utensils, color: 'text-accent-green' },
    { key: 'dinner', label: 'Dinner', icon: Drumstick, color: 'text-accent-blue' },
    { key: 'snack', label: 'Snack', icon: Cookie, color: 'text-accent-purple' },
];

const NutritionTab = () => {
    const { nutritionLogs, addNutritionLog, deleteNutritionLog, settings, calculateDailyBurn, metrics } = useApp();
    const [subTab, setSubTab] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(getToday);
    const [showSearch, setShowSearch] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const scannerRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [trendFilter, setTrendFilter] = useState('1M');
    const [activeMealType, setActiveMealType] = useState('breakfast');
    const [waterAmount, setWaterAmount] = useState('');

    const targets = settings.nutritionTargets || { calories: 2500, protein: 180, carbs: 220, fat: 80 };
    const waterTarget = settings.waterTarget || 3000;

    const dailyLogs = useMemo(() =>
        nutritionLogs.filter(n => n.date === selectedDate)
        , [nutritionLogs, selectedDate]);

    const dailyTotals = useMemo(() => ({
        calories: dailyLogs.reduce((a, c) => a + c.calories, 0),
        protein: dailyLogs.reduce((a, c) => a + c.protein, 0),
        carbs: dailyLogs.reduce((a, c) => a + c.carbs, 0),
        fat: dailyLogs.reduce((a, c) => a + c.fat, 0),
        water: dailyLogs.reduce((a, c) => a + (c.water || 0), 0),
    }), [dailyLogs]);

    const latestMetric = useMemo(() => [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null, [metrics]);
    const bmr = latestMetric?.bmr || 0;

    const dailyBurn = useMemo(() => {
        const exBurn = calculateDailyBurn(selectedDate);
        return bmr > 0 ? calculateTDEE(bmr, 'moderate', exBurn) : exBurn;
    }, [selectedDate, calculateDailyBurn, bmr]);

    const netCalories = dailyTotals.calories - dailyBurn;

    const mealGroups = useMemo(() => {
        return MEAL_TYPES.map(mt => ({
            ...mt,
            items: dailyLogs.filter(l => l.mealType === mt.key),
            cals: dailyLogs.filter(l => l.mealType === mt.key).reduce((a, c) => a + c.calories, 0),
        }));
    }, [dailyLogs]);

    // Food Library — unique food items from past entries
    const foodLibrary = useMemo(() => {
        const seen = {};
        nutritionLogs.forEach(l => {
            const key = `${l.name}|${l.brand || ''}`;
            if (!seen[key]) {
                seen[key] = { name: l.name, brand: l.brand || '', calories: l.calories, protein: l.protein, carbs: l.carbs, fat: l.fat, count: 1 };
            } else {
                seen[key].count++;
            }
        });
        return Object.values(seen).sort((a, b) => b.count - a.count);
    }, [nutritionLogs]);

    // OpenFoodFacts search
    const doSearch = useCallback(async () => {
        if (!navigator.onLine) {
            alert('Offline Mode: Cannot search OpenFoodFacts while offline.');
            return;
        }
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchQuery)}&json=1&page_size=10`);
            const data = await res.json();
            setSearchResults((data.products || []).map(p => ({
                name: p.product_name || 'Unknown',
                brand: p.brands || '',
                calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
                protein: Math.round(p.nutriments?.proteins_100g || 0),
                carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
                fat: Math.round(p.nutriments?.fat_100g || 0),
                imgUrl: p.image_small_url || '',
            })));
        } catch { setSearchResults([]); }
        setSearching(false);
    }, [searchQuery]);

    // Handle barcode search
    const doBarcodeSearch = useCallback(async (barcode) => {
        if (!navigator.onLine) {
            alert('Offline Mode: Cannot search OpenFoodFacts while offline.');
            setShowScanner(false);
            return;
        }
        setSearching(true);
        setShowScanner(false);
        setSearchQuery(barcode); // pre-fill search input
        setShowSearch(true);
        try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
            const data = await res.json();
            if (data.status === 1 && data.product) {
                const p = data.product;
                setSearchResults([{
                    name: p.product_name || 'Unknown',
                    brand: p.brands || '',
                    calories: Math.round(p.nutriments?.['energy-kcal_100g'] || 0),
                    protein: Math.round(p.nutriments?.proteins_100g || 0),
                    carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
                    fat: Math.round(p.nutriments?.fat_100g || 0),
                    imgUrl: p.image_small_url || '',
                }]);
            } else {
                setSearchResults([]);
            }
        } catch { setSearchResults([]); }
        setSearching(false);
    }, []);

    const addFromSearch = (food) => {
        addNutritionLog({
            id: generateId(), date: selectedDate,
            name: food.name, brand: food.brand, servingAmount: 100,
            calories: food.calories, protein: food.protein,
            carbs: food.carbs, fat: food.fat,
            mealType: activeMealType,
        });
        setShowSearch(false);
        setShowLibrary(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const addWater = (ml) => {
        addNutritionLog({
            id: generateId(), date: selectedDate,
            name: 'Water', brand: '', servingAmount: ml,
            calories: 0, protein: 0, carbs: 0, fat: 0,
            mealType: 'snack', water: ml
        });
    };

    const [manualForm, setManualForm] = useState({
        name: '', brand: '', servingAmount: 100, calories: 0, protein: 0, carbs: 0, fat: 0, mealType: 'breakfast'
    });

    const handleManualSave = (e) => {
        e.preventDefault();
        addNutritionLog({ id: generateId(), date: selectedDate, ...manualForm });
        setManualForm({ name: '', brand: '', servingAmount: 100, calories: 0, protein: 0, carbs: 0, fat: 0, mealType: 'breakfast' });
        setShowManual(false);
    };

    // Trend data
    const trendData = useMemo(() => {
        const datesMap = {};
        nutritionLogs.forEach(n => {
            if (!datesMap[n.date]) datesMap[n.date] = { date: n.date, calories: 0, protein: 0, carbs: 0, fat: 0, burn: 0 };
            datesMap[n.date].calories += n.calories;
            datesMap[n.date].protein += n.protein;
            datesMap[n.date].carbs += n.carbs;
            datesMap[n.date].fat += n.fat;
        });
        Object.keys(datesMap).forEach(d => {
            datesMap[d].burn = calculateDailyBurn(d);
            datesMap[d].net = datesMap[d].calories - datesMap[d].burn;
        });
        const sorted = Object.values(datesMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        return filterByTime(sorted, 'date', trendFilter).map(d => ({ ...d, date: d.date.substring(5) }));
    }, [nutritionLogs, calculateDailyBurn, trendFilter]);

    // Barcode scanner effect — uses Html5Qrcode directly for more control
    useEffect(() => {
        if (!showScanner) return;

        let html5Qrcode = null;
        let stopped = false;

        const startScanner = async () => {
            // Wait a tick for the DOM element to render
            await new Promise(r => setTimeout(r, 100));
            if (stopped) return;

            const readerEl = document.getElementById('reader');
            if (!readerEl) return;

            html5Qrcode = new Html5Qrcode('reader');
            scannerRef.current = html5Qrcode;

            try {
                await html5Qrcode.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText) => {
                        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                        html5Qrcode.stop().catch(() => { });
                        scannerRef.current = null;
                        doBarcodeSearch(decodedText);
                    },
                    () => { /* ignore scan errors */ }
                );
            } catch (err) {
                console.error('Camera start failed:', err);
                setShowScanner(false);
                alert('Could not access camera. Please check permissions.');
            }
        };

        startScanner();

        return () => {
            stopped = true;
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }
        };
    }, [showScanner, doBarcodeSearch]);

    return (
        <div className="pb-24 animate-fade-in">
            <div className="tab-bar mb-5">
                {['daily', 'trends'].map(tab => (
                    <button key={tab} onClick={() => setSubTab(tab)}
                        className={subTab === tab ? 'tab-active' : 'tab'}>
                        {tab === 'daily' ? 'Daily Log' : 'Trends'}
                    </button>
                ))}
            </div>

            {/* ── DAILY LOG ── */}
            {subTab === 'daily' && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white">Daily Log</h2>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                            className="input !w-auto !py-1.5 !px-3 !text-sm !font-bold" />
                    </div>

                    {/* Calorie Overview */}
                    <div className="card-elevated">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="section-label">Calories</p>
                                <p className="text-3xl font-black text-white">
                                    {dailyTotals.calories}<span className="text-sm text-slate-500 font-medium ml-1">/ {targets.calories}</span>
                                </p>
                            </div>
                            <div className="text-right space-y-0.5">
                                <p className="text-[10px] font-bold text-slate-500" title="Total Daily Energy Expenditure">{bmr > 0 ? 'TDEE:' : 'Burned:'} <span className="text-orange-400">{dailyBurn}</span></p>
                                <p className={`text-sm font-black ${netCalories > targets.calories ? 'text-accent-red' : 'text-accent-green'}`}>
                                    Net: {netCalories} kcal
                                </p>
                            </div>
                        </div>
                        <div className="progress-bar mb-4">
                            <div className={`progress-fill ${dailyTotals.calories > targets.calories ? 'bg-accent-red' : 'bg-accent-blue'}`}
                                style={{ width: `${Math.min(100, (dailyTotals.calories / targets.calories) * 100)}%` }} />
                        </div>

                        {/* Macro Bars */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Protein', current: dailyTotals.protein, target: targets.protein, color: 'bg-accent-green', textColor: 'text-accent-green', icon: '💪' },
                                { label: 'Carbs', current: dailyTotals.carbs, target: targets.carbs, color: 'bg-accent-blue', textColor: 'text-accent-blue', icon: '⚡' },
                                { label: 'Fat', current: dailyTotals.fat, target: targets.fat, color: 'bg-accent-amber', textColor: 'text-amber-400', icon: '🫒' },
                            ].map(m => (
                                <div key={m.label} className="bg-navy-900 p-2.5 rounded-xl text-center">
                                    <p className={`text-[9px] font-bold uppercase ${m.textColor}`}>{m.icon} {m.label}</p>
                                    <p className="text-lg font-black text-white">{Math.round(m.current)}<span className="text-[10px] text-slate-600">g</span></p>
                                    <p className="text-[9px] text-slate-500">of {m.target}g</p>
                                    <div className="progress-bar mt-1.5">
                                        <div className={`progress-fill ${m.current > m.target ? 'bg-accent-red' : m.color}`}
                                            style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Water Tracking — Interactive */}
                    <div className="card-elevated">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4 text-accent-blue" />
                                <span className="font-bold text-white text-sm">Water</span>
                            </div>
                            <span className={`text-sm font-black ${dailyTotals.water >= waterTarget ? 'text-accent-green' : 'text-accent-blue'}`}>
                                {dailyTotals.water} / {waterTarget} ml
                            </span>
                        </div>
                        <div className="progress-bar mb-3">
                            <div className="progress-fill bg-accent-blue" style={{ width: `${Math.min(100, (dailyTotals.water / waterTarget) * 100)}%` }} />
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[250, 500, 750, 1000].map(ml => (
                                <button key={ml} onClick={() => addWater(ml)}
                                    className="py-2 text-accent-blue bg-accent-blue/10 border border-accent-blue/20 text-xs font-bold rounded-xl transition-colors hover:bg-accent-blue/20">
                                    +{ml}ml
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Buttons */}
                    <div className="flex gap-1.5 text-xs">
                        <button onClick={() => setShowScanner(true)} className="btn-ghost flex-1 flex flex-col items-center justify-center gap-1.5 !py-3">
                            <Barcode className="w-5 h-5 text-accent-red" /> Scan
                        </button>
                        <button onClick={() => setShowSearch(true)} className="btn-ghost flex-1 flex flex-col items-center justify-center gap-1.5 !py-3">
                            <Search className="w-5 h-5 text-accent-blue" /> Search
                        </button>
                        <button onClick={() => setShowLibrary(true)} className="btn-ghost flex-1 flex flex-col items-center justify-center gap-1.5 !py-3">
                            <BookOpen className="w-5 h-5 text-accent-green" /> My Foods
                        </button>
                        <button onClick={() => setShowManual(true)} className="btn-ghost flex-1 flex flex-col items-center justify-center gap-1.5 !py-3">
                            <Plus className="w-5 h-5 text-accent-purple" /> Custom
                        </button>
                    </div>

                    {/* Food Diary — Grouped by Meal Type */}
                    <div className="space-y-4">
                        {mealGroups.map(group => {
                            const Icon = group.icon;
                            return (
                                <div key={group.key}>
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-3.5 h-3.5 ${group.color}`} />
                                            <h4 className={`font-bold text-sm ${group.color}`}>{group.label}</h4>
                                        </div>
                                        {group.items.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500">{group.cals} kcal</span>
                                            </div>
                                        )}
                                    </div>
                                    {group.items.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {group.items.map(entry => (
                                                <div key={entry.id} className="card flex items-center justify-between group !py-2.5 !px-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-white text-sm leading-tight truncate">{entry.name}</p>
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            {entry.brand && <>{entry.brand} · </>}
                                                            P:{entry.protein}g · C:{entry.carbs}g · F:{entry.fat}g
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-2 shrink-0">
                                                        <span className="text-sm font-black text-accent-green">{entry.calories}</span>
                                                        <button onClick={() => deleteNutritionLog(entry.id)}
                                                            className="btn-icon !p-1"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="card !py-2.5 !px-3 text-center">
                                            <p className="text-xs text-slate-600 italic">No {group.label.toLowerCase()} logged</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Search Modal — CENTERED */}
                    {showSearch && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowSearch(false)}>
                            <div className="bg-navy-800 rounded-3xl w-full max-w-sm border border-navy-600/30 animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="p-5 border-b border-navy-600/30">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xl font-black text-white">Search Food</h3>
                                        <button onClick={() => setShowSearch(false)} className="btn-icon"><X className="w-4 h-4" /></button>
                                    </div>
                                    {/* Meal Type Selector */}
                                    <div className="flex gap-2 mb-3">
                                        {MEAL_TYPES.map(mt => {
                                            const Icon = mt.icon;
                                            return (
                                                <button key={mt.key} onClick={() => setActiveMealType(mt.key)}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 ${activeMealType === mt.key ? `bg-accent-blue/20 text-accent-blue border border-accent-blue/30` : 'bg-navy-900 text-slate-500 border border-navy-600/20'
                                                        }`}>
                                                    <Icon className="w-3 h-3" /> {mt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && doSearch()}
                                            placeholder="Search OpenFoodFacts..." className="input flex-1" id="search-input" />
                                        <button onClick={doSearch} className="btn-primary !px-4" disabled={searching}>
                                            {searching ? '...' : 'Go'}
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-[50vh] p-5 space-y-2">
                                    {searchResults.map((food, i) => (
                                        <div key={i} onClick={() => addFromSearch(food)}
                                            className="card-interactive flex items-center gap-3 !p-3">
                                            {food.imgUrl ? (
                                                <img src={food.imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center">
                                                    <Apple className="w-4 h-4 text-accent-green" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{food.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{food.brand} · per 100g</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-black text-accent-green">{food.calories}</p>
                                                <p className="text-[9px] text-slate-500">kcal</p>
                                            </div>
                                        </div>
                                    ))}
                                    {searchResults.length === 0 && !searching && searchQuery && (
                                        <p className="text-center text-slate-600 py-4">No results. Try a different search term.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Food Library Modal — CENTERED */}
                    {showLibrary && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowLibrary(false)}>
                            <div className="bg-navy-800 rounded-3xl w-full max-w-sm border border-navy-600/30 animate-scale-in overflow-hidden" onClick={e => e.stopPropagation()}>
                                <div className="p-5 border-b border-navy-600/30">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xl font-black text-white">My Foods</h3>
                                        <button onClick={() => setShowLibrary(false)} className="btn-icon"><X className="w-4 h-4" /></button>
                                    </div>
                                    {/* Meal Type Selector */}
                                    <div className="flex gap-2">
                                        {MEAL_TYPES.map(mt => {
                                            const Icon = mt.icon;
                                            return (
                                                <button key={mt.key} onClick={() => setActiveMealType(mt.key)}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 ${activeMealType === mt.key ? `bg-accent-blue/20 text-accent-blue border border-accent-blue/30` : 'bg-navy-900 text-slate-500 border border-navy-600/20'
                                                        }`}>
                                                    <Icon className="w-3 h-3" /> {mt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="overflow-y-auto max-h-[50vh] p-5 space-y-2">
                                    {foodLibrary.length > 0 ? foodLibrary.map((food, i) => (
                                        <div key={i} onClick={() => addFromSearch(food)}
                                            className="card-interactive flex items-center gap-3 !p-3">
                                            <div className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-accent-purple" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{food.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate">
                                                    {food.brand && <>{food.brand} · </>}
                                                    × {food.count} logged · P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-black text-accent-green">{food.calories}</p>
                                                <p className="text-[9px] text-slate-500">kcal</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-center text-slate-600 py-6">No foods logged yet. Search or add a custom entry first.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Manual Entry Modal */}
                    {showManual && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowManual(false)}>
                            <form onSubmit={handleManualSave} className="bg-navy-800 rounded-3xl p-5 w-full max-w-sm border border-navy-600/30 space-y-3 animate-scale-in" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-white">Custom Entry</h3>
                                    <button type="button" onClick={() => setShowManual(false)} className="btn-icon"><X className="w-4 h-4" /></button>
                                </div>
                                <input placeholder="Food Name" required value={manualForm.name}
                                    onChange={e => setManualForm({ ...manualForm, name: e.target.value })} className="input font-bold" />
                                <input placeholder="Brand (optional)" value={manualForm.brand}
                                    onChange={e => setManualForm({ ...manualForm, brand: e.target.value })} className="input !text-sm" />
                                <div>
                                    <p className="section-label mb-2">Meal Type</p>
                                    <div className="flex gap-2">
                                        {MEAL_TYPES.map(mt => {
                                            const Icon = mt.icon;
                                            return (
                                                <button key={mt.key} type="button" onClick={() => setManualForm({ ...manualForm, mealType: mt.key })}
                                                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 ${manualForm.mealType === mt.key ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' : 'bg-navy-900 text-slate-500 border border-navy-600/20'
                                                        }`}>
                                                    <Icon className="w-3 h-3" /> {mt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="section-label !text-accent-red">Calories</label>
                                        <input type="number" value={manualForm.calories || ''} onChange={e => setManualForm({ ...manualForm, calories: Number(e.target.value) })}
                                            className="input !font-bold !text-accent-red" />
                                    </div>
                                    <div>
                                        <label className="section-label !text-accent-green">Protein (g)</label>
                                        <input type="number" value={manualForm.protein || ''} onChange={e => setManualForm({ ...manualForm, protein: Number(e.target.value) })}
                                            className="input !font-bold !text-accent-green" />
                                    </div>
                                    <div>
                                        <label className="section-label !text-accent-blue">Carbs (g)</label>
                                        <input type="number" value={manualForm.carbs || ''} onChange={e => setManualForm({ ...manualForm, carbs: Number(e.target.value) })}
                                            className="input !font-bold !text-accent-blue" />
                                    </div>
                                    <div>
                                        <label className="section-label !text-amber-400">Fat (g)</label>
                                        <input type="number" value={manualForm.fat || ''} onChange={e => setManualForm({ ...manualForm, fat: Number(e.target.value) })}
                                            className="input !font-bold !text-amber-400" />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary w-full font-black">Add Entry</button>
                            </form>
                        </div>
                    )}

                    {/* Barcode Scanner Modal */}
                    {showScanner && (
                        <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
                            <div className="p-5 flex justify-between items-center bg-black/80 absolute top-0 w-full z-10 border-b border-navy-600/30">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2"><Barcode className="w-5 h-5 text-accent-red" /> Scan Barcode</h3>
                                <button onClick={() => setShowScanner(false)} className="btn-icon"><X className="w-6 h-6 text-white" /></button>
                            </div>

                            <div className="flex-1 mt-16 p-4 flex items-center justify-center">
                                <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-navy-600/30 bg-navy-900 shadow-2xl" style={{ minHeight: '280px' }}></div>
                            </div>

                            <p className="text-slate-400 text-center text-xs pb-6 px-8">Point your camera at a food barcode to automatically search OpenFoodFacts.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── TRENDS ── */}
            {subTab === 'trends' && (
                <div className="space-y-5">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white">Nutrition Trends</h2>
                        <TimeFilter value={trendFilter} onChange={setTrendFilter} />
                    </div>

                    {/* Calories + Net Calories */}
                    <div className="card-elevated">
                        <SectionHeader icon={Apple} title="Calories & Net Calories" iconColor="text-accent-red" />
                        {trendData.length > 0 ? (
                            <div className="h-56 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                                        <Line type="monotone" dataKey="calories" name="Calories" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 2.5 }} />
                                        <Line type="monotone" dataKey="net" name="Net Calories" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-600 py-8 text-sm">No trend data available for this period.</p>
                        )}
                    </div>

                    {/* Macros Trend */}
                    <div className="card-elevated">
                        <SectionHeader icon={Apple} title="Macros Over Time" iconColor="text-accent-green" />
                        {trendData.length > 0 ? (
                            <div className="h-56 w-full -ml-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a2235" />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip {...tooltipStyle} />
                                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                                        <Line type="monotone" dataKey="protein" name="Protein" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2.5 }} />
                                        <Line type="monotone" dataKey="carbs" name="Carbs" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                                        <Line type="monotone" dataKey="fat" name="Fat" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-600 py-8 text-sm">No trend data available for this period.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NutritionTab;
