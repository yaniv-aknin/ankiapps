import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ListTodo, Settings, Check, X, Key, RefreshCw } from 'lucide-react';
import type { QuizSettings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/types';
import { invokeAnkiConnect } from '../lib/anki';

export default function Home() {
    const [settings, setSettings] = useState<QuizSettings>(() => {
        const savedSettings = localStorage.getItem('quizSettings');
        return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
    });

    const [apiKeyValid, setApiKeyValid] = useState(false);
    const [ankiReachable, setAnkiReachable] = useState(false);
    const [ankiChecking, setAnkiChecking] = useState(false);
    const [ankiError, setAnkiError] = useState<string | null>(null);

    const [tempApiKey, setTempApiKey] = useState(settings.anthropicApiKey);
    const [tempAnkiUrl, setTempAnkiUrl] = useState(settings.ankiConnectUrl);

    const checkAnkiConnection = useCallback(async () => {
        setAnkiChecking(true);
        setAnkiError(null);
        try {
            await invokeAnkiConnect('version', {}, tempAnkiUrl);
            setAnkiReachable(true);
        } catch (error) {
            setAnkiReachable(false);
            setAnkiError(error instanceof Error ? error.message : 'Connection failed');
        } finally {
            setAnkiChecking(false);
        }
    }, [tempAnkiUrl]);

    useEffect(() => {
        setApiKeyValid(!!settings.anthropicApiKey && settings.anthropicApiKey.trim().length > 0);
        checkAnkiConnection();
    }, [settings.anthropicApiKey, checkAnkiConnection]);

    const saveApiKey = () => {
        const newSettings = { ...settings, anthropicApiKey: tempApiKey };
        setSettings(newSettings);
        localStorage.setItem('quizSettings', JSON.stringify(newSettings));
        setApiKeyValid(!!tempApiKey && tempApiKey.trim().length > 0);
    };

    const saveAnkiUrl = () => {
        const newSettings = { ...settings, ankiConnectUrl: tempAnkiUrl };
        setSettings(newSettings);
        localStorage.setItem('quizSettings', JSON.stringify(newSettings));
        checkAnkiConnection();
    };

    const isFullyConfigured = apiKeyValid && ankiReachable;

    if (!isFullyConfigured) {
        return (
            <div className="max-w-2xl mx-auto animate-fadeIn">
                <h1 className="text-3xl font-bold mb-8 text-gray-900">Welcome to AnkiApps</h1>

                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${apiKeyValid ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                {apiKeyValid ? (
                                    <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                    <X className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Anthropic API Key
                                </h3>
                                {apiKeyValid ? (
                                    <p className="text-sm text-green-600 font-medium">Configured</p>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-600">
                                            Enter your Anthropic API key to use AI features
                                        </p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="password"
                                                    value={tempApiKey}
                                                    onChange={(e) => setTempApiKey(e.target.value)}
                                                    placeholder="sk-ant-..."
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={saveApiKey}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                Save
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Stored locally in your browser
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ankiReachable ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                {ankiReachable ? (
                                    <Check className="w-5 h-5 text-green-600" />
                                ) : (
                                    <X className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Anki Connection
                                </h3>
                                {ankiReachable ? (
                                    <p className="text-sm text-green-600 font-medium">Connected</p>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-gray-600">
                                            Configure AnkiConnect to access your cards
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={tempAnkiUrl}
                                                onChange={(e) => setTempAnkiUrl(e.target.value)}
                                                placeholder="http://localhost:8765"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            />
                                            <button
                                                onClick={saveAnkiUrl}
                                                disabled={ankiChecking}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {ankiChecking ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Testing
                                                    </>
                                                ) : (
                                                    'Test & Save'
                                                )}
                                            </button>
                                        </div>
                                        {ankiError && (
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                <p className="text-xs text-red-700">{ankiError}</p>
                                            </div>
                                        )}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-xs text-gray-700">
                                                <strong>Setup required:</strong>
                                            </p>
                                            <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc space-y-1">
                                                <li>Install AnkiConnect add-on in Anki</li>
                                                <li>Configure CORS in AnkiConnect settings to allow this origin</li>
                                                <li>Make sure Anki is running</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto text-center animate-fadeIn">
            <div className="grid md:grid-cols-2 gap-6">
                <Link
                    to="/quiz"
                    className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz</h2>
                    <p className="text-gray-600">
                        Practice with context-aware questions using your Anki cards
                    </p>
                </Link>

                <Link
                    to="/generate"
                    className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-100 transition-colors">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Generate</h2>
                    <p className="text-gray-600">
                        Create new Anki cards with AI-generated content
                    </p>
                </Link>

                <Link
                    to="/review"
                    className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
                        <ListTodo className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Review</h2>
                    <p className="text-gray-600">
                        Check and manage your Anki cards
                    </p>
                </Link>

                <Link
                    to="/settings"
                    className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-100 transition-colors">
                        <Settings className="w-8 h-8 text-gray-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
                    <p className="text-gray-600">
                        Configure your API keys and preferences
                    </p>
                </Link>
            </div>
        </div>
    );
}
