import { useState, useEffect } from 'react';
import type { QuizSettings } from '../lib/types';
import { DEFAULT_SETTINGS, DEFAULT_PROMPTS } from '../lib/types';
import { QuizService } from '../lib/quiz-service';
import { loadVocabulary, addNote, updateNote } from '../lib/anki';
import { Sparkles, Save, Trash2, Check, AlertCircle } from 'lucide-react';

interface GeneratedCard {
    id: string;
    front: string;
    back: string;
    saved: boolean;
    noteId?: number;
    fieldNames?: string[];
    saving?: boolean;
}

export default function Generate() {
    const [prompt, setPrompt] = useState(
        "Given this set of Anki cards, propose 50 more cards that complement the existing one in terms of content, difficulty level, etc."
    );
    const [shareCards, setShareCards] = useState(true);
    const [model, setModel] = useState<QuizSettings['model']>('claude-haiku-4-5');
    const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
    const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('quizSettings');
        if (saved) {
            const parsed = JSON.parse(saved);

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

            setSettings(parsed);
            setModel(parsed.model);
        }
    }, []);

    const handleGenerate = async () => {
        if (!settings.anthropicApiKey) {
            setError('Please set your Anthropic API Key in Settings.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            let contextCards: { front: string; back: string }[] = [];
            if (shareCards) {
                const vocab = await loadVocabulary(settings.maxWords, settings.deckFilter || '', settings.ankiConnectUrl);
                if (vocab) contextCards = vocab;
            }

            const quizService = new QuizService(settings.anthropicApiKey);
            const cards = await quizService.generateCards(prompt, contextCards, { ...settings, model });

            const newCards = cards.map((c) => ({
                id: Math.random().toString(36).substring(2, 11),
                front: c.front,
                back: c.back,
                saved: false,
            }));
            setGeneratedCards(newCards);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error generating cards');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCard = async (index: number) => {
        const card = generatedCards[index];
        if (card.saving) return;
        if (!settings.ankiConnectUrl) {
            setError('AnkiConnect URL not set');
            return;
        }

        const updatedCards = [...generatedCards];
        updatedCards[index].saving = true;
        setGeneratedCards(updatedCards);

        try {
            if (card.noteId) {
                // Update existing note
                const fields: Record<string, string> = {};
                if (card.fieldNames && card.fieldNames.length >= 2) {
                    fields[card.fieldNames[0]] = card.front;
                    fields[card.fieldNames[1]] = card.back;
                } else {
                    fields['Front'] = card.front;
                    fields['Back'] = card.back;
                }

                await updateNote(card.noteId, fields, settings.ankiConnectUrl);
                updatedCards[index].saved = true;
            } else {
                // Add new note
                const { result, fieldNames } = await addNote(
                    card.front,
                    card.back,
                    settings.deckFilter || 'Default',
                    'Basic',
                    settings.ankiConnectUrl
                );

                updatedCards[index].noteId = result;
                updatedCards[index].fieldNames = fieldNames;
                updatedCards[index].saved = true;
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error saving card');
            updatedCards[index].saved = false;
        } finally {
            updatedCards[index].saving = false;
            setGeneratedCards([...updatedCards]);
        }
    };

    const updateCardContent = (index: number, field: 'front' | 'back', value: string) => {
        const updatedCards = [...generatedCards];
        updatedCards[index][field] = value;
        updatedCards[index].saved = false;
        setGeneratedCards(updatedCards);
    };

    const handleDeleteCard = (index: number) => {
        const updatedCards = [...generatedCards];
        updatedCards.splice(index, 1);
        setGeneratedCards(updatedCards);
    };

    const handleSaveAll = async () => {
        const unsavedIndices = generatedCards
            .map((card, index) => (card.saved ? -1 : index))
            .filter((index) => index !== -1);

        // Sequentially save to avoid overloading AnkiConnect if it's sensitive, or just Parallel
        // Parallel usually okay for local.
        await Promise.all(unsavedIndices.map((index) => handleSaveCard(index)));
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 animate-slideDown">
            <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-purple-600" />
                Generate Cards
            </h1>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center rounded-r shadow-sm">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 h-32 focus:bg-white transition-all shadow-sm"
                            placeholder="Describe the cards you want to generate..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value as QuizSettings['model'])}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
                            >
                                <option value="claude-haiku-4-5">Claude 4.5 Haiku (Fast & Cheap)</option>
                                <option value="claude-sonnet-4-5">Claude 4.5 Sonnet (Intelligent)</option>
                            </select>
                        </div>

                        <div className="flex items-center pt-8">
                            <label className="flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={shareCards}
                                    onChange={(e) => setShareCards(e.target.checked)}
                                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 transition"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">Use existing cards as context</span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all shadow-lg flex justify-center items-center ${loading
                            ? 'bg-purple-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:-translate-y-0.5'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Sparkles className="animate-spin mr-2 w-5 h-5" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 w-5 h-5" />
                                Generate Cards
                            </>
                        )}
                    </button>
                </div>
            </div>

            {generatedCards.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 animate-slideUp">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-xl font-bold text-gray-800">Generated Cards ({generatedCards.length})</h2>
                        <button
                            onClick={handleSaveAll}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors shadow-md flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save All
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider w-5/12">Front</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider w-5/12">Back</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider w-2/12">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {generatedCards.map((card, index) => (
                                    <tr key={card.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={card.front}
                                                onChange={(e) => updateCardContent(index, 'front', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={card.back}
                                                onChange={(e) => updateCardContent(index, 'back', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-transparent transition-all"
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleSaveCard(index)}
                                                    disabled={card.saved || card.saving}
                                                    className={`p-2 rounded-lg transition-colors ${card.saved
                                                        ? 'bg-green-100 text-green-700 cursor-default'
                                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                        }`}
                                                    title={card.saved ? "Saved" : "Save"}
                                                >
                                                    {card.saving ? <span className="animate-pulse">...</span> : card.saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCard(index)}
                                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
