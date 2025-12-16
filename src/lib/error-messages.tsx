import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function getAnkiConnectionError(): ReactNode {
    return (
        <>
            Cannot connect to AnkiConnect. Please
            <Link to="/" className="ml-1 underline font-semibold hover:text-red-900">
                check your configuration
            </Link>
            .
        </>
    );
}

export function getApiKeyError(): ReactNode {
    return (
        <>
            Anthropic API key not configured. Please
            <Link to="/" className="ml-1 underline font-semibold hover:text-red-900">
                check your configuration
            </Link>
            .
        </>
    );
}

export function getAnkiUrlError(): ReactNode {
    return (
        <>
            AnkiConnect URL not configured. Please
            <Link to="/" className="ml-1 underline font-semibold hover:text-red-900">
                check your configuration
            </Link>
            .
        </>
    );
}

export function isAnkiConnectionError(errorMsg: string): boolean {
    return errorMsg.includes('Cannot connect to Anki-Connect') || errorMsg.includes('Anki');
}
