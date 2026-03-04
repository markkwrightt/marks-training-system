import React, { useState } from 'react';
import { LayoutDashboard, Dumbbell, User, Apple, ClipboardList, Undo2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './components/Dashboard/Dashboard';
import TrainTab from './components/Train/TrainTab';
import BodyTab from './components/Body/BodyTab';
import NutritionTab from './components/Nutrition/NutritionTab';
import ReportTab from './components/Report/ReportTab';
import SettingsPanel from './components/Settings/SettingsPanel';

const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'train', label: 'Train', icon: Dumbbell },
    { id: 'body', label: 'Body', icon: User },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'report', label: 'Report', icon: ClipboardList },
];

const MainApp = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showSettings, setShowSettings] = useState(false);
    const { deletedHistory, undoDelete } = useApp();
    const canUndo = deletedHistory && deletedHistory.length > 0;

    return (
        <div className="min-h-screen bg-navy-900 text-slate-100 select-none relative">
            {/* Main Content */}
            <main className="max-w-md mx-auto px-4 pt-6 pb-28">
                {activeTab === 'dashboard' && <Dashboard onOpenSettings={() => setShowSettings(true)} />}
                {activeTab === 'train' && <TrainTab />}
                {activeTab === 'body' && <BodyTab />}
                {activeTab === 'nutrition' && <NutritionTab />}
                {activeTab === 'report' && <ReportTab />}
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav safe-bottom">
                <div className="flex">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={isActive ? 'nav-item-active' : 'nav-item'}
                            >
                                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                                <span className={`text-[9px] font-bold mt-0.5 uppercase tracking-wider ${isActive ? 'text-white' : ''}`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Global Undo Toast */}
            {canUndo && (
                <button
                    onClick={undoDelete}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-800 border border-navy-600/50 text-white px-5 py-2.5 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce z-50 hover:bg-navy-700 transition-colors">
                    <Undo2 className="w-4 h-4 text-accent-blue" />
                    <span>Undo Delete</span>
                </button>
            )}

            {/* Settings Modal */}
            <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
};

const App = () => (
    <AppProvider>
        <MainApp />
    </AppProvider>
);

export default App;
