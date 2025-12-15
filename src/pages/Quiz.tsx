import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { VocabItem, QuizSettings } from '../lib/types';
import { DEFAULT_SETTINGS, getTextDirection } from '../lib/types';
import { loadVocabulary } from '../lib/anki';
import { QuizService } from '../lib/quiz-service';
import { AlertCircle, RefreshCw, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Home() {
    const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
    const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const answerInputRef = useRef<HTMLTextAreaElement>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<string | null>(null);
    const [result, setResult] = useState<'PASS' | 'FAIL' | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('quizSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);

            // Migration: convert old format to new format
            if (parsed.systemPrompt && !parsed.promptsConfig) {
                parsed.promptsConfig = {
                    ...DEFAULT_SETTINGS.promptsConfig,
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
        }
    }, []);

    const handleLoadVocabulary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const vocab = await loadVocabulary(settings.maxWords, settings.deckFilter, settings.ankiConnectUrl);

            if (vocab.length === 0) {
                throw new Error('No vocabulary found. Check your Anki connection and deck filter.');
            }

            setVocabulary(vocab);
            return vocab;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
            return null;
        } finally {
            setLoading(false);
        }
    }, [settings.maxWords, settings.deckFilter, settings.ankiConnectUrl]);

    const generateQuestion = useCallback(async () => {
        if (!settings.anthropicApiKey) {
            setError('Please set your Anthropic API Key in Settings.');
            return;
        }

        setLoading(true);
        setError(null);
        setFeedback(null);
        setResult(null);
        setUserAnswer('');

        try {
            let vocab = vocabulary;
            if (vocab.length === 0) {
                const loaded = await handleLoadVocabulary();
                if (!loaded) return;
                vocab = loaded;
            }

            const quizService = new QuizService(settings.anthropicApiKey);
            const data = await quizService.generateQuestion(vocab, settings);

            setPrompt(data.prompt);
            setCurrentQuestion(data.question);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate question');
        } finally {
            setLoading(false);
        }
    }, [vocabulary, handleLoadVocabulary, settings]);

    const submitAnswer = useCallback(async () => {
        if (!userAnswer.trim()) {
            setError('Please enter your answer first');
            return;
        }
        if (!settings.anthropicApiKey) {
            setError('Please set your Anthropic API Key in Settings.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const quizService = new QuizService(settings.anthropicApiKey);
            const data = await quizService.evaluateAnswer(prompt, userAnswer, settings);

            setResult(data.result);
            setFeedback(data.feedbackText);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to evaluate answer');
        } finally {
            setLoading(false);
        }
    }, [userAnswer, prompt, settings]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();

                if (!currentQuestion) {
                    generateQuestion();
                } else if (feedback && result) {
                    generateQuestion();
                } else if (userAnswer.trim()) {
                    submitAnswer();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestion, feedback, result, userAnswer, generateQuestion, submitAnswer]);

    useEffect(() => {
        if (currentQuestion && !feedback && !loading) {
            answerInputRef.current?.focus();
        }
    }, [currentQuestion, feedback, loading]);

    if (!settings.anthropicApiKey) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Setup Required</h2>
                <p className="text-gray-600 mb-6">You need to configure your Anthropic API Key to start the quiz.</p>
                <Link to="/settings" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
                    Go to Settings
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            {vocabulary.length > 0 && (
                <div className="flex justify-end mb-8 animate-slideDown">
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {vocabulary.length} cards loaded
                    </span>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center rounded-r shadow-sm animate-shake">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                </div>
            )}

            {!currentQuestion ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <RefreshCw className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to practice?</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        We will generate practice questions using your Anki cards.
                    </p>
                    <button
                        onClick={generateQuestion}
                        disabled={loading}
                        className="py-4 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {loading ? 'Generating...' : 'Start Quiz'}
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-fadeIn">
                    {settings.showCardsReference && vocabulary.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
                                <span className="w-1 h-6 bg-blue-500 rounded mr-2"></span>
                                Study Cards Reference
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Front</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Back</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {vocabulary.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 text-sm">{item.front}</td>
                                                <td className="px-6 py-3 text-sm">{item.back}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Question</h2>

                        <p
                            className="text-3xl font-medium text-gray-800 leading-relaxed mb-8"
                            dir={getTextDirection(prompt, settings.textDirection)}
                        >
                            {prompt}
                        </p>

                        {settings.promptsConfig.uiLabels.tip && (
                            <div className="flex items-center text-sm text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block">
                                <span className="font-semibold mr-1">Tip:</span> {settings.promptsConfig.uiLabels.tip}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">{settings.promptsConfig.uiLabels.answerLabel}</label>
                        <textarea
                            ref={answerInputRef}
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            dir={getTextDirection(userAnswer || '', settings.textDirection)}
                            className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 bg-white transition-all shadow-sm"
                            rows={4}
                            placeholder="Type your answer here..."
                            disabled={loading}
                        />
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            onClick={submitAnswer}
                            disabled={loading || !!feedback}
                            className="flex-1 py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Evaluating...
                                </>
                            ) : (
                                <>Submit Answer <Send className="w-4 h-4" /></>
                            )}
                        </button>
                        <button
                            onClick={generateQuestion}
                            disabled={loading}
                            className="flex-1 py-4 px-6 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl border border-gray-300 transition-all shadow-sm hover:shadow-md flex justify-center items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Skip / New Question
                        </button>
                    </div>

                    {feedback && result && (
                        <div className={`rounded-xl p-8 border-l-4 shadow-lg animate-slideUp ${result === 'PASS'
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                            }`}>
                            <div className="flex items-center gap-3 mb-4">
                                {result === 'PASS' ? <CheckCircle className="w-8 h-8 text-green-600" /> : <XCircle className="w-8 h-8 text-red-600" />}
                                <h2 className={`text-2xl font-bold ${result === 'PASS' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {result === 'PASS' ? 'Great Job!' : 'Keep Trying'}
                                </h2>
                            </div>

                            <p
                                className={`text-lg leading-relaxed ${result === 'PASS' ? 'text-green-700' : 'text-red-700'}`}
                                dir={getTextDirection(feedback, settings.textDirection)}
                            >
                                {feedback}
                            </p>

                            <div className="mt-6 pt-6 border-t border-black/5 flex justify-end">
                                <button
                                    onClick={generateQuestion}
                                    className="text-sm font-semibold underline underline-offset-4 decoration-2 opacity-70 hover:opacity-100"
                                >
                                    Next Question →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
