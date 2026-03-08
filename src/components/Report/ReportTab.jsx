import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    CalendarDays, Apple, Activity, Flame, Radio, Scale, Droplets,
    TrendingDown, TrendingUp, Target, Dumbbell, Heart, Move, Bed, Printer, Share2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, estimateCaloriesBurned } from '../../utils/helpers';
import { jsPDF } from 'jspdf';

const ReportTab = () => {
    const { exercises, logs, nutritionLogs, metrics, settings, calculateDailyBurn } = useApp();
    const [weekOffset, setWeekOffset] = useState(0);
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef(null);

    const last7Days = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i - (weekOffset * 7));
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }, [weekOffset]);

    const averages = useMemo(() => {
        let totalCals = 0, totalBurn = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;
        let weightSum = 0, weightCount = 0, workoutDays = 0, restDays = 0, totalMeps = 0;
        let strengthSets = 0, cardioSets = 0, mobilitySets = 0, strengthVolume = 0;
        const nutDays = new Set();

        last7Days.forEach(date => {
            const dayNut = nutritionLogs.filter(n => n.date === date);
            const dayCals = dayNut.reduce((a, c) => a + c.calories, 0);
            totalCals += dayCals;
            totalPro += dayNut.reduce((a, c) => a + c.protein, 0);
            totalCarbs += dayNut.reduce((a, c) => a + c.carbs, 0);
            totalFat += dayNut.reduce((a, c) => a + c.fat, 0);
            if (dayNut.length > 0) nutDays.add(date);
            totalBurn += calculateDailyBurn(date);

            const dayLogs = logs.filter(l => l.date === date);
            if (dayLogs.length > 0) workoutDays++;
            else restDays++;
            totalMeps += dayLogs.reduce((a, c) => a + (c.meps || 0), 0);
            dayLogs.forEach(l => {
                const ex = exercises.find(e => e.id === l.exerciseId);
                if (ex?.category === 'weight') {
                    strengthSets++;
                    if (l.value && l.reps) strengthVolume += (parseFloat(l.value) * parseInt(l.reps));
                }
                if (ex?.category === 'cardio') cardioSets++;
                if (ex?.category === 'mobility') mobilitySets++;
            });

            const metric = metrics.find(m => m.date === date);
            if (metric?.weight) { weightSum += metric.weight; weightCount++; }
        });

        const sortedMetrics = [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date));
        const currentWeight = sortedMetrics[0]?.weight || '--';
        const currentFat = sortedMetrics[0]?.fat || '--';

        return {
            calAvg: Math.round(totalCals / 7),
            burnAvg: Math.round(totalBurn / 7),
            netAvg: Math.round((totalCals - totalBurn) / 7),
            proAvg: Math.round(totalPro / 7),
            carbsAvg: Math.round(totalCarbs / 7),
            fatAvg: Math.round(totalFat / 7),
            currentWeight, currentFat,
            weightAvg: weightCount > 0 ? (weightSum / weightCount).toFixed(1) : '--',
            workoutDays, restDays, totalMeps,
            strengthSets, cardioSets, mobilitySets, strengthVolume,
            nutDays: nutDays.size,
            mepsAvg: Math.round(totalMeps / Math.max(1, workoutDays)),
        };
    }, [last7Days, nutritionLogs, logs, metrics, exercises, calculateDailyBurn]);

    // Build daily data for export
    const dailyData = useMemo(() => {
        return last7Days.map(dateStr => {
            const dayNut = nutritionLogs.filter(n => n.date === dateStr);
            const dayCals = dayNut.reduce((a, c) => a + c.calories, 0);
            const dayPro = dayNut.reduce((a, c) => a + c.protein, 0);
            const dayCarbs = dayNut.reduce((a, c) => a + c.carbs, 0);
            const dayFat = dayNut.reduce((a, c) => a + c.fat, 0);
            const dayWorkouts = logs.filter(l => l.date === dateStr);
            const dayMetric = metrics.find(m => m.date === dateStr);
            const dayBurn = calculateDailyBurn(dateStr);
            const dayMeps = dayWorkouts.reduce((a, c) => a + (c.meps || 0), 0);

            const grouped = dayWorkouts.reduce((acc, log) => {
                const ex = exercises.find(e => e.id === log.exerciseId);
                if (!ex) return acc;
                if (!acc[log.exerciseId]) acc[log.exerciseId] = { count: 0, ex, bestValue: 0, bestReps: '', totalMeps: 0, maxRpe: 0 };
                acc[log.exerciseId].count++;
                if (log.value > acc[log.exerciseId].bestValue) {
                    acc[log.exerciseId].bestValue = log.value || 0;
                    acc[log.exerciseId].bestReps = log.reps || '';
                }
                acc[log.exerciseId].totalMeps += (log.meps || 0);
                acc[log.exerciseId].maxRpe = Math.max(acc[log.exerciseId].maxRpe, log.rpe || 0);
                return acc;
            }, {});

            return { dateStr, dayCals, dayPro, dayCarbs, dayFat, dayBurn, dayMeps, dayMetric, grouped, hasWorkout: dayWorkouts.length > 0 };
        });
    }, [last7Days, nutritionLogs, logs, metrics, exercises, calculateDailyBurn]);

    // ── PROGRAMMATIC PDF EXPORT ──
    const handleExportPDF = useCallback(async () => {
        setExporting(true);
        try {
            const W = 390;
            const margin = 16;
            const contentW = W - margin * 2;

            // Pre-calculate height
            let totalH = 20 + 90 + 80 + 100 + 30;
            dailyData.forEach(d => {
                totalH += 30;
                totalH += d.dayCals > 0 ? 60 : 20;
                if (d.hasWorkout) totalH += 25 + Object.keys(d.grouped).length * 18;
                totalH += 10;
            });
            totalH += 20;

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [W, totalH] });

            // Background
            pdf.setFillColor(10, 14, 26);
            pdf.rect(0, 0, W, totalH, 'F');

            const setColor = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                pdf.setTextColor(r, g, b);
            };
            const setFill = (hex) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                pdf.setFillColor(r, g, b);
            };
            const roundRect = (x, ry, w, h, radius, hex) => {
                setFill(hex);
                pdf.roundedRect(x, ry, w, h, radius, radius, 'F');
            };

            let y = 20;

            // ── HEADER CARD ──
            roundRect(margin, y, contentW, 80, 8, '#3730a3');
            y += 12;
            setColor('#a5b4fc');
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`7 DAY SUMMARY  ${formatDate(last7Days[6])} - ${formatDate(last7Days[0])}`, margin + 10, y);
            y += 14;

            setColor('#86efac');
            pdf.setFontSize(16);
            pdf.text(`${averages.workoutDays}`, margin + 10, y);
            setColor('#94a3b8');
            pdf.setFontSize(10);
            pdf.text(`/ ${averages.restDays} days`, margin + 28, y);

            setColor('#93c5fd');
            pdf.setFontSize(16);
            pdf.text(`${averages.currentWeight}`, margin + 100, y);
            setColor('#94a3b8');
            pdf.setFontSize(9);
            pdf.text(`kg${averages.currentFat !== '--' ? `  ${averages.currentFat}%` : ''}`, margin + 100 + pdf.getTextWidth(`${averages.currentWeight}`) + 2, y);

            y += 8;
            setColor('#a5b4fc');
            pdf.setFontSize(6);
            pdf.text('TRAINING / REST', margin + 10, y);
            pdf.text('CURRENT WEIGHT', margin + 100, y);

            y += 14;
            roundRect(margin + 8, y, contentW - 16, 28, 4, '#1e1b4b');
            const volSpacing = (contentW - 24) / 3;
            [
                { label: 'STRENGTH', val: `${averages.strengthSets}`, sub: `${Math.round(averages.strengthVolume).toLocaleString()} kg`, color: '#4ade80' },
                { label: 'CARDIO', val: `${averages.cardioSets}`, color: '#fb923c' },
                { label: 'MOBILITY', val: `${averages.mobilitySets}`, color: '#c084fc' },
            ].forEach((item, i) => {
                const x = margin + 12 + i * volSpacing + volSpacing / 2;
                setColor(item.color);
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                const valW = pdf.getTextWidth(item.val);
                pdf.text(item.val, x - valW / 2, y + 13);
                if (item.sub) {
                    pdf.setFontSize(6);
                    const subW = pdf.getTextWidth(item.sub);
                    pdf.text(item.sub, x - subW / 2, y + 19);
                }
                setColor('#94a3b8');
                pdf.setFontSize(5);
                const labelW = pdf.getTextWidth(item.label);
                pdf.text(item.label, x - labelW / 2, y + 25);
            });

            y += 36;

            // ── NUTRITION AVERAGES ──
            const nutItems = [
                { label: 'AVG CALORIES', val: `${averages.calAvg} kcal`, color: '#e2e8f0' },
                { label: 'AVG NET CALS', val: `${averages.netAvg} kcal`, color: averages.netAvg > (settings.nutritionTargets?.calories || 2500) ? '#fca5a5' : '#86efac' },
                { label: 'AVG PROTEIN', val: `${averages.proAvg}g`, color: '#86efac' },
                { label: 'AVG CARBS', val: `${averages.carbsAvg}g`, color: '#93c5fd' },
                { label: 'AVG FAT', val: `${averages.fatAvg}g`, color: '#fbbf24' },
                { label: 'AVG BURN', val: `${averages.burnAvg} kcal`, color: '#fdba74' },
            ];
            const nutColW = contentW / 2;
            nutItems.forEach((item, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const x = margin + col * nutColW + 10;
                const ny = y + row * 22;
                setColor('#6366f1');
                pdf.setFontSize(6);
                pdf.setFont('helvetica', 'bold');
                pdf.text(item.label, x, ny);
                setColor(item.color);
                pdf.setFontSize(14);
                pdf.text(item.val, x, ny + 13);
            });

            y += 72;

            // ── DAILY AUDIT LOG ──
            setColor('#ffffff');
            pdf.setFontSize(13);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Daily Audit Log', margin, y);
            y += 16;

            dailyData.forEach(d => {
                roundRect(margin, y, contentW, 22, 6, '#0f172a');
                setColor('#94a3b8');
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text(formatDate(d.dateStr), margin + 8, y + 14);

                if (d.dayMetric?.weight) {
                    setColor('#93c5fd');
                    pdf.setFontSize(7);
                    pdf.text(`${d.dayMetric.weight} kg`, margin + contentW - 70, y + 14);
                }
                setColor(d.hasWorkout ? '#86efac' : '#94a3b8');
                pdf.setFontSize(7);
                pdf.text(d.hasWorkout ? 'Trained' : 'Rest', margin + contentW - 30, y + 14);
                y += 26;

                if (d.dayCals > 0) {
                    roundRect(margin + 4, y, contentW - 8, 48, 4, '#0f172a');
                    const calTarget = settings.nutritionTargets?.calories || 2500;
                    const proTarget = settings.nutritionTargets?.protein || 180;
                    const colW2 = (contentW - 16) / 4;
                    [
                        { label: 'CALORIES', val: `${d.dayCals}`, color: d.dayCals > calTarget ? '#f87171' : '#e2e8f0' },
                        { label: 'PROTEIN', val: `${d.dayPro}g`, color: d.dayPro < proTarget ? '#f87171' : '#86efac' },
                        { label: 'CARBS', val: `${d.dayCarbs}g`, color: '#60a5fa' },
                        { label: 'FAT', val: `${d.dayFat}g`, color: '#fbbf24' },
                    ].forEach((ni, i) => {
                        const nx = margin + 8 + i * colW2 + colW2 / 2;
                        setColor('#475569');
                        pdf.setFontSize(5);
                        const nlW = pdf.getTextWidth(ni.label);
                        pdf.text(ni.label, nx - nlW / 2, y + 10);
                        setColor(ni.color);
                        pdf.setFontSize(11);
                        pdf.setFont('helvetica', 'bold');
                        const nvW = pdf.getTextWidth(ni.val);
                        pdf.text(ni.val, nx - nvW / 2, y + 22);
                    });

                    setColor('#fb923c');
                    pdf.setFontSize(7);
                    pdf.text(`Burned: ${d.dayBurn} kcal`, margin + 10, y + 38);
                    const netVal = d.dayCals - d.dayBurn;
                    setColor(netVal > calTarget ? '#f87171' : '#86efac');
                    pdf.setFont('helvetica', 'bold');
                    const netText = `Net: ${netVal} kcal`;
                    pdf.text(netText, margin + contentW - 10 - pdf.getTextWidth(netText), y + 38);
                    y += 52;
                } else {
                    setColor('#475569');
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'italic');
                    pdf.text('No diet data', margin + 10, y + 10);
                    y += 16;
                }

                if (d.hasWorkout) {
                    Object.values(d.grouped).forEach(g => {
                        roundRect(margin + 4, y, contentW - 8, 15, 3, '#0f172a');
                        setColor('#cbd5e1');
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(`${g.count}\u00D7 ${g.ex.name}`, margin + 10, y + 10);
                        setColor('#86efac');
                        const exVal = `${g.bestValue} ${g.ex.unit}${g.bestReps ? ` \u00D7 ${g.bestReps}` : ''}`;
                        pdf.text(exVal, margin + contentW - 10 - pdf.getTextWidth(exVal), y + 10);
                        y += 17;
                    });
                }
                y += 6;
            });

            pdf.save(`fitness-report-${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
            alert('Failed to export PDF. Please try again.');
        }
        setExporting(false);
    }, [averages, dailyData, last7Days, settings]);

    // ── WHATSAPP SHARE (formatted text) ──
    const handleShareWhatsApp = useCallback(async () => {
        setExporting(true);
        try {
            let text = `\u{1F4CA} *7 DAY FITNESS REPORT*\n`;
            text += `${formatDate(last7Days[6])} \u2192 ${formatDate(last7Days[0])}\n\n`;

            text += `\u{1F3CB}\uFE0F *Training:* ${averages.workoutDays} days | \u{1F634} *Rest:* ${averages.restDays} days\n`;
            text += `\u2696\uFE0F *Weight:* ${averages.currentWeight} kg${averages.currentFat !== '--' ? ` (${averages.currentFat}% fat)` : ''}\n\n`;

            text += `\u{1F4AA} *Volume:* ${averages.strengthSets} strength | ${averages.cardioSets} cardio | ${averages.mobilitySets} mobility\n`;
            if (averages.strengthVolume > 0) text += `\u{1F4E6} *Total Volume:* ${Math.round(averages.strengthVolume).toLocaleString()} kg\n`;
            text += `\n`;

            text += `\u{1F37D}\uFE0F *Avg Nutrition:*\n`;
            text += `\u2022 Calories: ${averages.calAvg} kcal\n`;
            text += `\u2022 Protein: ${averages.proAvg}g | Carbs: ${averages.carbsAvg}g | Fat: ${averages.fatAvg}g\n`;
            text += `\u2022 Burn: ${averages.burnAvg} kcal | Net: ${averages.netAvg} kcal\n\n`;

            text += `\u{1F4CB} *DAILY LOG:*\n`;
            text += `\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n`;

            dailyData.forEach(d => {
                text += `\n\u{1F4C5} *${formatDate(d.dateStr)}*`;
                if (d.dayMetric?.weight) text += ` (${d.dayMetric.weight}kg)`;
                text += d.hasWorkout ? ' \u2705\n' : ' \u{1F634}\n';

                if (d.dayCals > 0) {
                    text += `  \u{1F34E} ${d.dayCals} cal | P:${d.dayPro}g C:${d.dayCarbs}g F:${d.dayFat}g\n`;
                    text += `  \u{1F525} Burned: ${d.dayBurn} | Net: ${d.dayCals - d.dayBurn}\n`;
                }

                if (d.hasWorkout) {
                    Object.values(d.grouped).forEach(g => {
                        text += `  \u{1F4AA} ${g.count}\u00D7 ${g.ex.name} \u2192 ${g.bestValue} ${g.ex.unit}`;
                        if (g.bestReps) text += ` \u00D7 ${g.bestReps}`;
                        if (g.maxRpe > 0) text += ` (RPE ${g.maxRpe})`;
                        text += `\n`;
                    });
                }
            });

            text += `\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n_Mark's Training System_`;

            if (navigator.share) {
                await navigator.share({ title: '7-Day Fitness Report', text });
            } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Share failed:', err);
                alert('Sharing failed. Please try again.');
            }
        }
        setExporting(false);
    }, [averages, dailyData, last7Days]);

    return (
        <div className="space-y-5 pb-24 animate-fade-in" ref={reportRef}>
            <style>{`
                @media print {
                    body { background-color: white !important; color: black !important; }
                    nav { display: none !important; }
                    .bg-navy-900, .bg-gradient-to-br, .card, .bg-white\\/5 { background: white !important; border: 1px solid #cbd5e1 !important; color: black !important; break-inside: avoid; }
                    .text-white, .text-slate-300, .text-slate-400, .text-slate-500, .text-indigo-200 { color: #0f172a !important; }
                    .print\\:hidden { display: none !important; }
                    .badge-green, .badge-blue, .badge-red { border: 1px solid #94a3b8; background: transparent !important; color: black !important; }
                    * { box-shadow: none !important; text-shadow: none !important; }
                }
            `}</style>

            {/* Summary Header */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-900 rounded-2xl p-6 text-white shadow-xl shadow-indigo-900/30 relative overflow-hidden">
                <CalendarDays className="absolute -right-4 -top-4 w-28 h-28 opacity-[0.07] print:hidden" />
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-5">
                        <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em] print:text-black">
                            7 Day Summary <span className="opacity-70 normal-case ml-1">({formatDate(last7Days[6])} - {formatDate(last7Days[0])})</span>
                        </p>
                        <div className="flex gap-1.5 print:hidden">
                            <button onClick={handleShareWhatsApp} disabled={exporting}
                                className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Share to WhatsApp">
                                <Share2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{exporting ? '...' : 'WhatsApp'}</span>
                            </button>
                            <button onClick={handleExportPDF} disabled={exporting}
                                className="bg-white/10 hover:bg-white/20 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50" title="Export PDF">
                                <Printer className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{exporting ? '...' : 'Export PDF'}</span>
                            </button>
                            <button onClick={() => setWeekOffset(w => w + 1)}
                                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-xs font-bold transition-colors">&larr; Prev</button>
                            {weekOffset > 0 && (
                                <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
                                    className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-xs font-bold transition-colors">Next &rarr;</button>
                            )}
                        </div>
                    </div>

                    {/* Training Summary */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-300" />
                            <div>
                                <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Training / Rest</p>
                                <p className="text-xl font-black">
                                    <span className="text-accent-green">{averages.workoutDays}</span>
                                    <span className="text-white/50 mx-1">/</span>
                                    <span className="text-slate-300">{averages.restDays}</span>
                                    <span className="text-xs font-medium opacity-50 ml-1">days</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-blue-300" />
                            <div>
                                <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Current Weight</p>
                                <p className="text-xl font-black">
                                    {averages.currentWeight}<span className="text-xs font-medium opacity-50 ml-1">kg</span>
                                    {averages.currentFat !== '--' && <span className="text-sm text-blue-200/70 ml-2">{averages.currentFat}% fat</span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Volume Breakdown */}
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                        <p className="text-[9px] text-indigo-200/60 uppercase font-bold mb-2">Volume Breakdown</p>
                        <div className={`grid ${settings.myzoneConnected ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center`}>
                            <div>
                                <Dumbbell className="w-3 h-3 mx-auto text-green-400 mb-1" />
                                <p className="text-lg font-black">{averages.strengthSets}</p>
                                <p className="text-[10px] text-green-300/80 font-bold">{Math.round(averages.strengthVolume).toLocaleString()} kg</p>
                                <p className="text-[8px] opacity-60 uppercase mt-0.5">Strength</p>
                            </div>
                            <div>
                                <Heart className="w-3 h-3 mx-auto text-orange-400 mb-1" />
                                <p className="text-lg font-black">{averages.cardioSets}</p>
                                <p className="text-[8px] opacity-60 uppercase">Cardio</p>
                            </div>
                            <div>
                                <Move className="w-3 h-3 mx-auto text-purple-400 mb-1" />
                                <p className="text-lg font-black">{averages.mobilitySets}</p>
                                <p className="text-[8px] opacity-60 uppercase">Mobility</p>
                            </div>
                            {settings.myzoneConnected && (
                                <div>
                                    <Radio className="w-3 h-3 mx-auto text-rose-400 mb-1" />
                                    <p className="text-lg font-black text-rose-300">{averages.totalMeps}</p>
                                    <p className="text-[8px] opacity-60 uppercase">MEPs</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nutrition Averages */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Calories</p>
                            <p className="text-xl font-black">{averages.calAvg} <span className="text-xs font-medium opacity-50">kcal</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Net Cals</p>
                            <p className={`text-xl font-black ${averages.netAvg > (settings.nutritionTargets?.calories || 2500) ? 'text-rose-300' : 'text-green-300'}`}>
                                {averages.netAvg} <span className="text-xs font-medium opacity-50">kcal</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Protein</p>
                            <p className="text-xl font-black text-green-300">{averages.proAvg}<span className="text-xs font-medium opacity-50">g</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Carbs</p>
                            <p className="text-xl font-black text-blue-300">{averages.carbsAvg}<span className="text-xs font-medium opacity-50">g</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Fat</p>
                            <p className="text-xl font-black text-amber-300">{averages.fatAvg}<span className="text-xs font-medium opacity-50">g</span></p>
                        </div>
                        <div>
                            <p className="text-[9px] text-indigo-200/60 uppercase font-bold">Avg Burn</p>
                            <p className="text-xl font-black text-orange-300">{averages.burnAvg}<span className="text-xs font-medium opacity-50">kcal</span></p>
                        </div>
                        {settings.myzoneConnected && (
                            <div className="col-span-2 border-t border-white/10 pt-3 mt-1">
                                <p className="text-[9px] text-rose-200/60 uppercase font-bold flex items-center gap-1"><Radio className="w-3 h-3" /> Avg MEPs / Session</p>
                                <p className="text-xl font-black text-rose-300">{averages.mepsAvg}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <h3 className="font-black text-lg text-white px-1">Daily Audit Log</h3>

            <div className="space-y-3">
                {last7Days.map(dateStr => {
                    const dayNut = nutritionLogs.filter(n => n.date === dateStr);
                    const dayCals = dayNut.reduce((a, c) => a + c.calories, 0);
                    const dayPro = dayNut.reduce((a, c) => a + c.protein, 0);
                    const dayCarbs = dayNut.reduce((a, c) => a + c.carbs, 0);
                    const dayFat = dayNut.reduce((a, c) => a + c.fat, 0);
                    const dayWorkouts = logs.filter(l => l.date === dateStr);
                    const dayMetric = metrics.find(m => m.date === dateStr);
                    const dayBurn = calculateDailyBurn(dateStr);
                    const dayMeps = dayWorkouts.reduce((a, c) => a + (c.meps || 0), 0);
                    const dayNet = dayCals - dayBurn;
                    const calTarget = settings.nutritionTargets?.calories || 2500;
                    const proTarget = settings.nutritionTargets?.protein || 180;

                    const grouped = dayWorkouts.reduce((acc, log) => {
                        const ex = exercises.find(e => e.id === log.exerciseId);
                        if (!ex) return acc;
                        if (!acc[log.exerciseId]) acc[log.exerciseId] = { count: 0, ex, bestValue: 0, bestReps: '', totalMeps: 0, maxRpe: 0 };
                        acc[log.exerciseId].count++;
                        if (log.value > acc[log.exerciseId].bestValue) {
                            acc[log.exerciseId].bestValue = log.value || 0;
                            acc[log.exerciseId].bestReps = log.reps || '';
                        }
                        acc[log.exerciseId].totalMeps += (log.meps || 0);
                        acc[log.exerciseId].maxRpe = Math.max(acc[log.exerciseId].maxRpe, log.rpe || 0);
                        return acc;
                    }, {});

                    return (
                        <div key={dateStr} className="card overflow-hidden !p-0">
                            <div className="bg-navy-900/50 px-4 py-2.5 border-b border-navy-600/20 flex justify-between items-center">
                                <span className="font-bold text-slate-400 text-sm">{formatDate(dateStr)}</span>
                                <div className="flex items-center gap-2">
                                    {dayMetric?.weight && <span className="badge-blue text-[10px]">{dayMetric.weight} kg</span>}
                                    {dayWorkouts.length > 0 ? (
                                        <span className="badge-green text-[10px]">Trained</span>
                                    ) : (
                                        <span className="badge bg-navy-700 text-slate-400 border-navy-600/20 text-[10px]">Rest</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                {/* Diet Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Apple className="w-4 h-4 text-accent-red" />
                                            <span className="text-sm font-bold text-slate-500">Diet</span>
                                        </div>
                                        {dayCals > 0 && (
                                            <span className={`text-xs font-bold ${dayCals > calTarget ? 'text-accent-red' : 'text-accent-green'}`}>
                                                {dayCals > calTarget ? '+' : ''}{dayCals - calTarget} vs target
                                            </span>
                                        )}
                                    </div>
                                    {dayCals > 0 ? (
                                        <div className="bg-navy-900 rounded-xl p-3">
                                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                                <div>
                                                    <p className="text-[8px] font-bold text-slate-600 uppercase">Calories</p>
                                                    <p className={`font-black ${dayCals > calTarget ? 'text-accent-red' : 'text-white'}`}>{dayCals}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-bold text-accent-green/60 uppercase">Protein</p>
                                                    <p className={`font-black ${dayPro < proTarget ? 'text-accent-red' : 'text-accent-green'}`}>{dayPro}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-bold text-accent-blue/60 uppercase">Carbs</p>
                                                    <p className="font-black text-accent-blue">{dayCarbs}g</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-bold text-amber-400/60 uppercase">Fat</p>
                                                    <p className="font-black text-amber-400">{dayFat}g</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-between mt-2 pt-2 border-t border-navy-600/10 text-[10px]">
                                                <span className="text-orange-400 font-bold">Burned: {dayBurn} kcal</span>
                                                <span className={`font-black ${dayNet > calTarget ? 'text-accent-red' : 'text-accent-green'}`}>Net: {dayNet} kcal</span>
                                            </div>
                                        </div>
                                    ) : <span className="text-xs text-slate-600 italic">No data</span>}
                                </div>

                                {/* Training Section */}
                                {dayWorkouts.length > 0 && (
                                    <div className="border-t border-navy-600/10 pt-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-accent-green" />
                                                <span className="text-sm font-bold text-slate-500">Training</span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <span className="badge-green"><Flame className="w-3 h-3" /> ~{dayBurn} kcal</span>
                                                {settings.myzoneConnected && <span className="badge-red"><Radio className="w-3 h-3" /> {dayMeps} MEPs</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {Object.values(grouped).map((g, i) => {
                                                let trend = null;
                                                if (g.ex.category === 'weight') {
                                                    const pastLogs = logs.filter(l => l.exerciseId === g.ex.id && new Date(l.date) < new Date(dateStr));
                                                    if (pastLogs.length > 0) {
                                                        const prevBest = Math.max(...pastLogs.map(l => parseFloat(l.value) || 0));
                                                        if (g.bestValue > prevBest) trend = 'up';
                                                        else if (g.bestValue < prevBest) trend = 'down';
                                                    }
                                                }
                                                return (
                                                    <div key={i} className="flex items-center justify-between bg-navy-900 px-3 py-2 rounded-lg text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-slate-300 font-bold">{g.count}&times; {g.ex.name}</span>
                                                            {trend === 'up' && <TrendingUp className="w-3 h-3 text-accent-green" />}
                                                            {trend === 'down' && <TrendingDown className="w-3 h-3 text-accent-red" />}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-accent-green font-black">
                                                                {g.bestValue} {g.ex.unit}
                                                                {g.bestReps && <span className="text-slate-400 font-bold ml-1">&times; {g.bestReps}</span>}
                                                            </span>
                                                            {g.maxRpe > 0 && <span className="text-slate-500">RPE {g.maxRpe}</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReportTab;
