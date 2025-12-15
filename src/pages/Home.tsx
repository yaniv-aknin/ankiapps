import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ListTodo, Settings } from 'lucide-react';

export default function Home() {
    return (
        <div className="max-w-4xl mx-auto text-center animate-fadeIn">
            <div className="grid md:grid-cols-2 gap-6 mb-12">
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

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="text-sm text-gray-600">
                    <strong>Getting Started:</strong> Configure your Anthropic API key in Settings to begin
                </p>
            </div>
        </div>
    );
}
