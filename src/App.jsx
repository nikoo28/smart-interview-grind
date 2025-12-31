import React, { useState, useEffect, useMemo } from 'react';
import ConfigurationPanel from './components/ConfigurationPanel';
import ScheduleView from './components/ScheduleView';
import Footer from './components/Footer';
import WelcomeScreen from './components/WelcomeScreen';
import Wizard from './components/Wizard';
import ConfigSummary from './components/ConfigSummary';
import LicenseGate from './components/LicenseGate';
import ConfirmationModal from './components/ConfirmationModal';
import { generateSchedule } from './utils/scheduler';

function App() {
    // Security: Problems are loaded ONLY after decryption
    const [problemsData, setProblemsData] = useState(null);
    const [isRestoringSession, setIsRestoringSession] = useState(true);

    // UI State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, title: '', message: '', isDanger: false });

    // View State (Persisted)
    const [viewMode, setViewMode] = useState(() => {
        const saved = localStorage.getItem('grind_view_mode_v2');
        return saved ? saved : 'welcome';
    });

    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('grind_config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }
        return {
            weeks: 4,
            hoursPerWeek: 6,
            selectedDifficulties: ['Medium'],
            selectedCompanies: [],
            selectedTopics: [],
            experienceLevel: 'Intermediate'
        };
    });

    // Helper to persist immediately
    const setAndPersistViewMode = (mode) => {
        setViewMode(mode);
        localStorage.setItem('grind_view_mode_v2', mode);
    };

    // Config Persistence
    useEffect(() => {
        localStorage.setItem('grind_config', JSON.stringify(config));
    }, [config]);


    // Helper: Buffer <-> Base64
    const bufferToBase64 = (buffer) => {
        const binary = String.fromCharCode(...new Uint8Array(buffer));
        return window.btoa(binary);
    };

    const base64ToBuffer = (base64) => {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // DECRYPTION HANDLER
    const handleUnlock = async (keyBuffer) => {
        try {
            // FIX: Use relative path or base_url for GH Pages support
            const lockUrl = import.meta.env.BASE_URL + 'problems.lock';

            // 1. Fetch Encrypted Lockbox
            const response = await fetch(lockUrl);
            if (!response.ok) throw new Error(`Could not find problems.lock at ${lockUrl}`);

            const lockBuffer = await response.arrayBuffer();

            // 2. Extract Parts (Format: [IV 12][AuthTag 16][Ciphertext])
            const iv = lockBuffer.slice(0, 12);
            const authTag = lockBuffer.slice(12, 28);
            const ciphertext = lockBuffer.slice(28);

            // Reassemble for Web Crypto API: [Ciphertext, AuthTag]
            const encryptedData = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
            encryptedData.set(new Uint8Array(ciphertext), 0);
            encryptedData.set(new Uint8Array(authTag), ciphertext.byteLength);

            // 3. Import Key
            const key = await window.crypto.subtle.importKey(
                "raw",
                keyBuffer,
                "AES-GCM",
                true,
                ["decrypt"]
            );

            // 4. Decrypt
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encryptedData
            );

            // 5. Parse JSON
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedBuffer);
            const problems = JSON.parse(jsonString);

            setProblemsData(problems); // This Unlocks the App

            // 6. Persist Session (Secure UX)
            try {
                const base64Key = bufferToBase64(keyBuffer);
                sessionStorage.setItem('grind_session_key', base64Key);
            } catch (err) {
                console.warn("Failed to save session key", err);
            }

        } catch (e) {
            console.error("Decryption Failed", e);
            alert("Security Error: Failed to decrypt data. Invalid license or corrupted lockfile.");
            sessionStorage.removeItem('grind_session_key'); // Clear bad key
        }
    };

    // Auto-Restore Session
    useEffect(() => {
        const restoreSession = async () => {
            const savedKey = sessionStorage.getItem('grind_session_key');
            if (savedKey) {
                try {
                    const keyBuffer = base64ToBuffer(savedKey);
                    await handleUnlock(keyBuffer);
                } catch (e) {
                    console.error("Session restore failed", e);
                    sessionStorage.removeItem('grind_session_key');
                }
            }
            // Done trying to restore (whether success or fail)
            setIsRestoringSession(false);
        };
        restoreSession();
    }, []);


    // Calculate live stats for the Configuration Panel
    const filteredStats = useMemo(() => {
        if (!problemsData) return { 'Very Easy': 0, 'Easy': 0, 'Medium': 0, 'Hard': 0, 'Very Hard': 0 };

        const stats = { 'Very Easy': 0, 'Easy': 0, 'Medium': 0, 'Hard': 0, 'Very Hard': 0 };

        problemsData.forEach(p => {
            if (config.selectedCompanies.length > 0) {
                const hasCompany = p.companies.some(c => config.selectedCompanies.includes(c));
                if (!hasCompany) return;
            }
            if (config.selectedTopics.length > 0) {
                const pTags = (p.relatedTopics || []).map(t => t.name);
                const hasTopic = config.selectedTopics.some(t => pTags.includes(t));
                if (!hasTopic) return;
            }
            if (stats[p.difficulty] !== undefined) {
                stats[p.difficulty]++;
            }
        });
        return stats;
    }, [problemsData, config.selectedCompanies, config.selectedTopics]);

    // Dynamic Company Counts
    const dynamicCompanyCounts = useMemo(() => {
        if (!problemsData) return new Map();
        const map = new Map();
        problemsData.forEach(p => {
            if (!config.selectedDifficulties.includes(p.difficulty)) return;
            if (config.selectedTopics.length > 0) {
                const pTags = (p.relatedTopics || []).map(t => t.name);
                const hasTopic = config.selectedTopics.some(t => pTags.includes(t));
                if (!hasTopic) return;
            }
            p.companies.forEach(c => {
                map.set(c, (map.get(c) || 0) + 1);
            });
        });
        return map;
    }, [problemsData, config.selectedDifficulties, config.selectedTopics]);

    // Dynamic Topic Counts
    const dynamicTopicCounts = useMemo(() => {
        if (!problemsData) return new Map();
        const map = new Map();
        problemsData.forEach(p => {
            if (!config.selectedDifficulties.includes(p.difficulty)) return;
            if (config.selectedCompanies.length > 0) {
                const hasCompany = p.companies.some(c => config.selectedCompanies.includes(c));
                if (!hasCompany) return;
            }
            if (p.relatedTopics && Array.isArray(p.relatedTopics)) {
                p.relatedTopics.forEach(t => {
                    const name = t.name || t;
                    map.set(name, (map.get(name) || 0) + 1);
                });
            }
        });
        return map;
    }, [problemsData, config.selectedDifficulties, config.selectedCompanies]);

    const [completed, setCompleted] = useState(() => {
        const saved = localStorage.getItem('grind_completed');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    useEffect(() => {
        localStorage.setItem('grind_completed', JSON.stringify([...completed]));
    }, [completed]);

    const schedule = useMemo(() => {
        if (!problemsData) return [];
        return generateSchedule(problemsData, config);
    }, [config, problemsData]);

    const totalProblems = schedule.reduce((acc, week) => acc + week.problems.length, 0);
    const completedProblems = schedule.reduce((acc, week) => acc + week.problems.filter(p => completed.has(p.id)).length, 0);

    const remainingMinutes = schedule.reduce((acc, week) => {
        return acc + week.problems
            .filter(p => !completed.has(p.id))
            .reduce((sum, p) => sum + p.duration, 0);
    }, 0);

    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;

    // Theme Management
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme');
            if (saved) return saved;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // LICENSE GATE: If no data loaded, show gate
    if (!problemsData) {
        if (isRestoringSession) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full mb-4"></div>
                        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            );
        }
        return <LicenseGate onUnlock={handleUnlock} />;
    }

    return (
        <div className="min-h-screen transition-colors duration-300 bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500 selection:text-white pb-20">
            <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 z-[2000] flex items-center justify-between px-8 transition-colors duration-300">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/20 text-white">⚡</div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Smart Interview Grind
                    </h1>
                </div>

                <div className="flex items-center gap-6">
                    {/* Stats Widget - Only show in App/Results */}
                    {(viewMode === 'app' || viewMode === 'results') && (
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <div className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400">Solved:</span>
                                <span className="text-gray-900 dark:text-white font-bold">{completedProblems} <span className="text-gray-400 font-normal">/ {totalProblems}</span></span>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400">Remaining:</span>
                                <span className="text-gray-900 dark:text-white font-bold">{remainingHours}h {remainingMins}m</span>
                            </div>
                        </div>
                    )}

                    {(viewMode === 'app' || viewMode === 'results') && (
                        <>
                            <button
                                onClick={() => setConfirmModal({
                                    isOpen: true,
                                    type: 'startOver',
                                    title: 'Start Over?',
                                    message: 'Are you sure you want to start over with a new plan? This will clear your current progress and settings.',
                                    isDanger: false
                                })}
                                className="hidden md:block text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Start Over
                            </button>

                            <button
                                onClick={() => setConfirmModal({
                                    isOpen: true,
                                    type: 'reset',
                                    title: 'Reset Progress?',
                                    message: 'Are you sure you want to reset all your progress marks? This action cannot be undone.',
                                    isDanger: true
                                })}
                                className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Reset Progress
                            </button>
                        </>
                    )}

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Toggle Theme"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        )}
                    </button>
                </div>
            </header>

            {/* View Logic */}
            {viewMode === 'welcome' && (
                <WelcomeScreen
                    onStartWizard={() => setAndPersistViewMode('wizard')}
                    onStartAdvanced={() => {
                        setConfig({
                            weeks: 4,
                            hoursPerWeek: 8,
                            selectedDifficulties: ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'],
                            selectedCompanies: [],
                            selectedTopics: [],
                            experienceLevel: 'Intermediate'
                        });
                        setAndPersistViewMode('app');
                    }}
                />
            )}

            {viewMode === 'wizard' && (
                <Wizard
                    config={config}
                    setConfig={setConfig}
                    allProblems={problemsData}
                    onComplete={() => setAndPersistViewMode('results')}
                    onCancel={() => setAndPersistViewMode('welcome')}
                />
            )}

            {(viewMode === 'app' || viewMode === 'results') && (
                <main className="pt-24 w-full px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Left: Configuration or Summary */}
                        <div className="lg:col-span-1">
                            {viewMode === 'app' ? (
                                <ConfigurationPanel
                                    config={config}
                                    setConfig={setConfig}
                                    allProblems={problemsData}
                                    filteredStats={filteredStats}
                                    dynamicCompanyCounts={dynamicCompanyCounts}
                                    dynamicTopicCounts={dynamicTopicCounts}
                                />
                            ) : (
                                <ConfigSummary
                                    config={config}
                                    onStartOver={() => {
                                        if (window.confirm('Start over with a new plan? This will clear your current progress.')) {
                                            setCompleted(new Set());
                                            setAndPersistViewMode('welcome');
                                        }
                                    }}
                                />
                            )}
                        </div>

                        {/* Right: Schedule (Scrollable) */}
                        <div className="lg:col-span-3">
                            <ScheduleView
                                schedule={schedule}
                                completed={completed}
                                setCompleted={setCompleted}
                            />
                        </div>
                    </div>
                </main>
            )}

            {(viewMode === 'app' || viewMode === 'results') && <Footer />}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    if (confirmModal.type === 'startOver') {
                        setCompleted(new Set());
                        setAndPersistViewMode('welcome');
                    } else if (confirmModal.type === 'reset') {
                        setCompleted(new Set());
                    }
                    setConfirmModal({ ...confirmModal, isOpen: false });
                }}
            />
        </div>
    );
}

export default App;
