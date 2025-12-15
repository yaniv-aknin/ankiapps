import { useState, useEffect } from 'react';
import type { QuizSettings, PromptsConfig } from '../lib/types';
import { DEFAULT_SETTINGS, DEFAULT_PROMPTS } from '../lib/types';
import { RotateCcw, Database, Key, Upload } from 'lucide-react';
import * as yaml from 'js-yaml';

export default function Settings() {
    const [settings, setSettings] = useState<QuizSettings>(() => {
        const savedSettings = localStorage.getItem('quizSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);

            // Migration: convert old format to new format
            if (parsed.systemPrompt && !parsed.promptsConfig) {
                parsed.promptsConfig = {
                    ...DEFAULT_PROMPTS,
                    systemPrompt: parsed.systemPrompt
                };
                delete parsed.systemPrompt;
                localStorage.setItem('quizSettings', JSON.stringify(parsed));
            }
            if (parsed.showVocabReference !== undefined && parsed.showCardsReference === undefined) {
                parsed.showCardsReference = parsed.showVocabReference;
                delete parsed.showVocabReference;
                localStorage.setItem('quizSettings', JSON.stringify(parsed));
            }

            return parsed;
        }
        return DEFAULT_SETTINGS;
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const validatePromptsConfig = (data: unknown): PromptsConfig => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON structure');
        }

        const config = data as Partial<PromptsConfig>;

        if (!config.name || typeof config.name !== 'string') {
            throw new Error('Missing or invalid "name" field');
        }
        if (!config.systemPrompt || typeof config.systemPrompt !== 'string') {
            throw new Error('Missing or invalid "systemPrompt" field');
        }
        if (!config.questionInstructions || typeof config.questionInstructions !== 'string') {
            throw new Error('Missing or invalid "questionInstructions" field');
        }
        if (!config.evaluationInstructions || typeof config.evaluationInstructions !== 'string') {
            throw new Error('Missing or invalid "evaluationInstructions" field');
        }
        if (!config.uiLabels || typeof config.uiLabels !== 'object') {
            throw new Error('Missing or invalid "uiLabels" field');
        }
        if (!config.uiLabels.answerLabel || typeof config.uiLabels.answerLabel !== 'string') {
            throw new Error('Missing or invalid "uiLabels.answerLabel" field');
        }
        if (!config.uiLabels.tip || typeof config.uiLabels.tip !== 'string') {
            throw new Error('Missing or invalid "uiLabels.tip" field');
        }

        return config as PromptsConfig;
    };

    const handlePromptsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setSuccess(null);

        try {
            const text = await file.text();
            let data: unknown;

            // Try to parse as YAML first, then fall back to JSON
            if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
                data = yaml.load(text);
            } else if (file.name.endsWith('.json')) {
                data = JSON.parse(text);
            } else {
                // Try both formats
                try {
                    data = yaml.load(text);
                } catch {
                    data = JSON.parse(text);
                }
            }

            const validated = validatePromptsConfig(data);

            setSettings({ ...settings, promptsConfig: validated });
            setSuccess(`Successfully loaded prompts: ${validated.name}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse prompts file');
        }

        event.target.value = '';
    };

    const resetToDefaultPrompts = () => {
        if (confirm('Are you sure you want to reset prompts to default?')) {
            setSettings({ ...settings, promptsConfig: DEFAULT_PROMPTS });
            setSuccess('Prompts reset to default');
        }
    };

    const resetSettings = () => {
        if (confirm('Are you sure you want to reset all settings to default? Your API key and URL will be cleared.')) {
            setSettings(DEFAULT_SETTINGS);
            localStorage.setItem('quizSettings', JSON.stringify(DEFAULT_SETTINGS));
        }
    };

    // Auto-save settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('quizSettings', JSON.stringify(settings));
    }, [settings]);

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn pb-12">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 border-b pb-4 border-gray-200">⚙️ Settings</h1>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r">
                    {success}
                </div>
            )}

            <div className="space-y-8">

                {/* Connections Section */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6 flex items-center text-gray-800">
                        <Database className="w-5 h-5 mr-2 text-blue-600" />
                        Connections
                    </h2>
                    <div className="grid gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Anthropic API Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="password"
                                    value={settings.anthropicApiKey}
                                    onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                                    placeholder="sk-ant-..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Stored locally in your browser. Never sent anywhere else.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">AnkiConnect URL</label>
                            <input
                                type="text"
                                value={settings.ankiConnectUrl}
                                onChange={(e) => setSettings({ ...settings, ankiConnectUrl: e.target.value })}
                                placeholder="http://localhost:8765"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Ensure Anki is running and AnkiConnect is installed.
                                You may need to configure AnkiConnect to allow CORS from this origin.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800">Model Selection</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Choose Model</label>
                        <select
                            value={settings.model}
                            onChange={(e) => setSettings({ ...settings, model: e.target.value as QuizSettings['model'] })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="claude-haiku-4-5">Claude 4.5 Haiku (Fast & Cheap)</option>
                            <option value="claude-sonnet-4-5">Claude 4.5 Sonnet (Intelligent)</option>
                        </select>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800">Prompts Configuration</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Configuration: <span className="font-bold text-blue-600">{settings.promptsConfig.name}</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Prompts File
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose File
                                    <input
                                        type="file"
                                        accept=".json,.yaml,.yml"
                                        onChange={handlePromptsUpload}
                                        className="hidden"
                                    />
                                </label>
                                <button
                                    onClick={resetToDefaultPrompts}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Reset to Default
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Upload a JSON or YAML file with custom prompts configuration. See contrib/hebrew-arabic.prompts.yaml for an example.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800">System Prompt</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Define how the model should create questions and evaluate answers
                        </label>
                        <textarea
                            value={settings.promptsConfig.systemPrompt}
                            onChange={(e) => setSettings({ ...settings, promptsConfig: { ...settings.promptsConfig, systemPrompt: e.target.value } })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-gray-50 h-64"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Part of the prompts configuration. Changes here are saved with your settings.
                        </p>
                    </div>
                </section>

                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold mb-6 text-gray-800">Quiz Configuration</h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Direction</label>
                                <select
                                    value={settings.direction}
                                    onChange={(e) => setSettings({ ...settings, direction: e.target.value as QuizSettings['direction'] })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="front → back">Front → Back</option>
                                    <option value="back → front">Back → Front</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Text Direction</label>
                                <select
                                    value={settings.textDirection}
                                    onChange={(e) => setSettings({ ...settings, textDirection: e.target.value as QuizSettings['textDirection'] })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="auto">Auto-detect</option>
                                    <option value="ltr">Left-to-Right (LTR)</option>
                                    <option value="rtl">Right-to-Left (RTL)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Cards from Anki</label>
                            <input
                                type="number"
                                min="10"
                                max="10000"
                                step="10"
                                value={settings.maxWords}
                                onChange={(e) => setSettings({ ...settings, maxWords: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Deck Filter (optional)</label>
                            <input
                                type="text"
                                value={settings.deckFilter}
                                onChange={(e) => setSettings({ ...settings, deckFilter: e.target.value })}
                                placeholder="e.g., 'MyDeck'"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="space-y-4 pt-2">
                            <label className="flex items-start">
                                <input
                                    type="checkbox"
                                    checked={settings.exposeOneSideOnly}
                                    onChange={(e) => setSettings({ ...settings, exposeOneSideOnly: e.target.checked })}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm">
                                    <span className="font-medium text-gray-900">Expose only the source side to the model</span>
                                    <span className="block text-gray-500 mt-1">
                                        Prevents the model from seeing the answer when generating the question.
                                    </span>
                                </span>
                            </label>

                            <label className="flex items-start">
                                <input
                                    type="checkbox"
                                    checked={settings.showCardsReference}
                                    onChange={(e) => setSettings({ ...settings, showCardsReference: e.target.checked })}
                                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-3 text-sm">
                                    <span className="font-medium text-gray-900">Show cards reference during quiz</span>
                                    <span className="block text-gray-500 mt-1">
                                        Display the cards table during the quiz (cheatsheet).
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4 pb-8">
                    <button
                        onClick={resetSettings}
                        className="flex items-center px-6 py-3 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg transition-all shadow-sm"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset to Defaults
                    </button>
                </div>
            </div>
        </div>
    );
}
