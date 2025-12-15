import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Sparkles, BookOpen, Settings, Home, ListTodo } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const links = [
        { to: '/', label: 'Home', icon: Home },
        { to: '/quiz', label: 'Quiz', icon: BookOpen },
        { to: '/generate', label: 'Generate', icon: Sparkles },
        { to: '/review', label: 'Review', icon: ListTodo },
        { to: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 flex items-center gap-2">
                                <BookOpen className="h-8 w-8 text-blue-600" />
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                    AnkiApps
                                </span>
                            </div>
                        </div>
                        <div className="hidden sm:flex sm:space-x-8">
                            {links.map((link) => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    className={({ isActive }) =>
                                        clsx(
                                            'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200',
                                            isActive
                                                ? 'border-blue-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        )
                                    }
                                >
                                    <link.icon className="w-4 h-4 mr-2" />
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Mobile menu (simplified) */}
                <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 flex justify-between z-50">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                clsx(
                                    'flex flex-col items-center p-2 text-xs font-medium transition-colors',
                                    isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                )
                            }
                        >
                            <link.icon className="w-6 h-6 mb-1" />
                            {link.label}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8">
                {children}
            </main>
        </div>
    );
}
