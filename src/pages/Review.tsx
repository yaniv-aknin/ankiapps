import { useState, useEffect, type ReactNode } from 'react';
import type { ReviewNote, ReviewMode, QuizSettings } from '../lib/types';
import { DEFAULT_SETTINGS, DEFAULT_PROMPTS, getTextDirection } from '../lib/types';
import { getReviewNotes, updateNote } from '../lib/anki';
import { Settings as SettingsIcon } from 'lucide-react';
import { getAnkiConnectionError, isAnkiConnectionError } from '../lib/error-messages';

type FontSize = '11pt' | '14pt' | '18pt';

function getFontSizeClass(size: FontSize) {
    switch (size) {
        case '11pt': return 'text-sm';
        case '14pt': return 'text-lg';
        case '18pt': return 'text-2xl';
        default: return 'text-lg';
    }
}

function ModeSelector<T extends string>({
    label,
    value,
    onChange,
    options
}: {
    label: string;
    value: T;
    onChange: (v: T) => void;
    options: readonly T[];
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 p-2">
            <span className="font-semibold text-sm w-16 mb-2 sm:mb-0 text-gray-700">{label}:</span>
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <label key={opt} className="inline-flex items-center cursor-pointer bg-gray-50 px-3 py-1 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors">
                        <input
                            type="radio"
                            className="form-radio text-blue-600 h-4 w-4 border-gray-300 focus:ring-blue-500 hidden"
                            checked={value === opt}
                            onChange={() => onChange(opt)}
                        />
                        <span className={`capitalize text-sm ${value === opt ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>{opt}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

function NoteCell({
    content,
    fieldName,
    noteId,
    mode,
    textDirection,
    fontSize,
    ankiConnectUrl
}: {
    content: string;
    fieldName: string;
    noteId: number;
    mode: ReviewMode;
    textDirection: 'auto' | 'ltr' | 'rtl';
    fontSize: FontSize;
    ankiConnectUrl: string;
}) {
    const [value, setValue] = useState(content || '');
    const [originalValue, setOriginalValue] = useState(content || '');
    const [isRevealed, setIsRevealed] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(content || '');
        setOriginalValue(content || '');
    }, [content]);

    const handleSave = async () => {
        if (value === originalValue) return;
        setSaving(true);
        try {
            await updateNote(noteId, { [fieldName]: value }, ankiConnectUrl);
            setOriginalValue(value);
        } catch (e) {
            console.error(e);
            alert('Failed to save to Anki. Check console.');
        } finally {
            setSaving(false);
        }
    };

    const handleBlur = () => {
        if (mode === 'editable') {
            handleSave();
        }
    };

    const dir = getTextDirection(value, textDirection);
    const fontSizeClass = getFontSizeClass(fontSize);

    if (mode === 'hidden' && !isRevealed) {
        return (
            <div
                className="cursor-pointer bg-gray-100 hover:bg-gray-200 rounded p-4 text-center text-gray-500 text-sm select-none transition-colors h-full flex items-center justify-center min-h-[60px] border border-dashed border-gray-300"
                onClick={() => setIsRevealed(true)}
            >
                (Click to reveal)
            </div>
        );
    }

    if (mode === 'visible' || (mode === 'hidden' && isRevealed)) {
        return <div dir={dir} className={`whitespace-pre-wrap break-words text-gray-900 leading-relaxed p-2 ${fontSizeClass}`}>{value}</div>;
    }

    return (
        <div className="relative group w-full h-full">
            <textarea
                dir={dir}
                className={`w-full p-3 border rounded-lg bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed min-h-[80px] resize-y shadow-sm ${fontSizeClass}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleBlur}
            />
            {mode === 'saveable' && value !== originalValue && (
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-md hover:bg-blue-700 disabled:opacity-50 transition-all hover:scale-105"
                >
                    {saving ? '...' : 'Save'}
                </button>
            )}
        </div>
    );
}

function StatBadge({ note }: { note: ReviewNote }) {
    const { grade, color, details } = note.stats;

    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-800 border-gray-300',
        blue: 'bg-blue-100 text-blue-800 border-blue-300',
        red: 'bg-red-100 text-red-800 border-red-300',
        orange: 'bg-orange-100 text-orange-800 border-orange-300',
        yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        lime: 'bg-lime-100 text-lime-800 border-lime-300',
        green: 'bg-green-100 text-green-800 border-green-300',
        emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };

    const badgeClass = colorClasses[color] || colorClasses['gray'];

    return (
        <div className="relative group/stat cursor-help w-full h-full flex items-center justify-center">
            <div className={`border rounded-lg p-2 text-center w-full h-full flex items-center justify-center ${badgeClass} shadow-sm`}>
                <div className="text-2xl font-bold">{grade}</div>
            </div>

            {/* Tooltip */}
            <div className="absolute right-full top-0 mr-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/stat:opacity-100 group-hover/stat:visible transition-all z-20 shadow-xl pointer-events-none">
                <pre className="whitespace-pre-wrap font-sans">{details}</pre>
                <div className="absolute right-[-6px] top-6 w-3 h-3 bg-gray-900 rotate-45 transform"></div>
            </div>
        </div>
    );
}

type SortOption = 'random' | 'front' | 'back' | 'bad-first' | 'good-first';

const GRADE_ORDER: Record<string, number> = {
    'F': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5, 'New': 6, 'N': 6
};

export default function Review() {
    const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
    const [notes, setNotes] = useState<ReviewNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ReactNode | null>(null);

    const [frontMode, setFrontMode] = useState<ReviewMode>('saveable');
    const [backMode, setBackMode] = useState<ReviewMode>('saveable');
    const [fontSize, setFontSize] = useState<FontSize>('14pt');
    const [sortOrder, setSortOrder] = useState<SortOption>('random');

    useEffect(() => {
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

            setSettings(parsed);
        }
    }, []);

    // Check connectivity on mount
    useEffect(() => {
        const checkConnectivity = async () => {
            setError(null);

            try {
                const { invokeAnkiConnect } = await import('../lib/anki');
                await invokeAnkiConnect('version', {}, settings.ankiConnectUrl);
            } catch {
                setError(getAnkiConnectionError());
            }
        };

        checkConnectivity();
    }, [settings.ankiConnectUrl]);

    useEffect(() => {
        const fetchNotes = async () => {
            if (!settings.ankiConnectUrl) return;

            setLoading(true);
            setError(null);
            try {
                const data = await getReviewNotes(settings.maxWords, settings.deckFilter, settings.ankiConnectUrl);
                setNotes(data);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to load notes';
                if (isAnkiConnectionError(errorMsg)) {
                    setError(getAnkiConnectionError());
                } else {
                    setError(errorMsg);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [settings.maxWords, settings.deckFilter, settings.ankiConnectUrl]);

    const getSortedNotes = () => {
        if (sortOrder === 'random') return notes;

        return [...notes].sort((a, b) => {
            if (sortOrder === 'front') return a.front.localeCompare(b.front);
            if (sortOrder === 'back') return a.back.localeCompare(b.back);
            if (sortOrder === 'bad-first') {
                return (GRADE_ORDER[a.stats.grade] ?? 6) - (GRADE_ORDER[b.stats.grade] ?? 6);
            }
            if (sortOrder === 'good-first') {
                return (GRADE_ORDER[b.stats.grade] ?? 6) - (GRADE_ORDER[a.stats.grade] ?? 6);
            }
            return 0;
        });
    };

    const sortedNotes = getSortedNotes();

    return (
        <div className="animate-slideDown">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">📋 Review Notes</h1>

                <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <ModeSelector label="Front" value={frontMode} onChange={setFrontMode} options={['visible', 'editable', 'saveable', 'hidden'] as const} />
                    <div className="h-px bg-gray-100"></div>
                    <ModeSelector label="Back" value={backMode} onChange={setBackMode} options={['visible', 'editable', 'saveable', 'hidden'] as const} />
                    <div className="h-px bg-gray-100"></div>

                    <div className="flex flex-wrap gap-6 items-center pt-1">
                        <ModeSelector label="Font" value={fontSize} onChange={setFontSize} options={['11pt', '14pt', '18pt'] as const} />

                        <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

                        <div className="flex items-center space-x-3">
                            <span className="font-semibold text-sm text-gray-700">Sort:</span>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as SortOption)}
                                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="random">Random</option>
                                <option value="front">Front (A-Z)</option>
                                <option value="back">Back (A-Z)</option>
                                <option value="bad-first">Bad First</option>
                                <option value="good-first">Good First</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r shadow-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 border-solid rounded-full animate-spin"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 border-solid rounded-full animate-spin absolute top-0 left-0 border-t-transparent"></div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                    <div className="grid grid-cols-[1fr_1fr_100px] border-b border-gray-200 bg-gray-50 text-left font-semibold text-gray-600 text-sm uppercase tracking-wider">
                        <div className="p-4">Front</div>
                        <div className="p-4 border-l border-gray-200">Back</div>
                        <div className="p-4 border-l border-gray-200 text-center">Stats</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {sortedNotes.map((note) => (
                            <div key={note.noteId} className="grid grid-cols-[1fr_1fr_100px] hover:bg-blue-50/30 transition-colors items-stretch">
                                <div className="p-4 min-w-0 flex flex-col">
                                    <NoteCell
                                        content={note.front}
                                        fieldName={note.frontFieldName}
                                        noteId={note.noteId}
                                        mode={frontMode}
                                        textDirection={settings.textDirection}
                                        fontSize={fontSize}
                                        ankiConnectUrl={settings.ankiConnectUrl}
                                    />
                                </div>
                                <div className="p-4 border-l border-gray-100 min-w-0 flex flex-col">
                                    <NoteCell
                                        content={note.back}
                                        fieldName={note.backFieldName}
                                        noteId={note.noteId}
                                        mode={backMode}
                                        textDirection={settings.textDirection}
                                        fontSize={fontSize}
                                        ankiConnectUrl={settings.ankiConnectUrl}
                                    />
                                </div>
                                <div className="p-4 border-l border-gray-100 flex items-stretch justify-center">
                                    <StatBadge note={note} />
                                </div>
                            </div>
                        ))}

                        {sortedNotes.length === 0 && (
                            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                <SettingsIcon className="w-10 h-10 text-gray-300 mb-2" />
                                <p className="text-lg font-medium">No notes found</p>
                                <p className="text-sm">Check your deck filter in settings or Anki connection.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
