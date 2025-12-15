import Anthropic from '@anthropic-ai/sdk';
import type { VocabItem, QuizSettings } from './types';

export class QuizService {
    private anthropic: Anthropic;

    constructor(apiKey: string) {
        this.anthropic = new Anthropic({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true,
        });
    }

    async generateQuestion(
        vocabulary: VocabItem[],
        settings: QuizSettings
    ): Promise<{ question: string; prompt: string }> {
        const { direction, exposeOneSideOnly, promptsConfig, model } = settings;

        const vocabList: string[] = [];
        for (const item of vocabulary) {
            if (exposeOneSideOnly) {
                if (direction === 'front → back') {
                    vocabList.push(item.front);
                } else {
                    vocabList.push(item.back);
                }
            } else {
                vocabList.push(`Front: ${item.front} | Back: ${item.back}`);
            }
        }

        // Shuffle and pick max words (though caller usually does this? calling API did it)
        // The previous API implementation received 'vocabulary' which was ALREADY limited by loadVocabulary??
        // Let's check loadVocabulary in page.tsx.
        // Yes, loadVocabulary called /api/anki which did limiting. So 'vocabulary' passed here is already limited?
        // Wait, generateQuestion in page.tsx passed 'vocabulary'.
        // In API generate/route.ts, it took vocabulary and processed it.
        // So assume we receive the full loaded vocab and might need to shuffle again?
        // Actually, in page.tsx: `const response = await fetch('/api/quiz/generate', { body: { vocabulary: vocab ... } })`
        // And vocab comes from loadVocabulary state.
        // In /api/anki, it returns limited vocab.
        // So 'vocabulary' here is already the subset we want to use?
        // Re-reading /api/quiz/generate/route.ts:
        // `const shuffledVocabList = vocabList.sort(() => Math.random() - 0.5);`
        // It shuffles what it gets. I should do the same.

        const shuffledVocabList = vocabList.sort(() => Math.random() - 0.5);
        const vocabText = shuffledVocabList.join('\n');
        let cardsDescription: string;

        if (exposeOneSideOnly) {
            cardsDescription = direction === 'front → back'
                ? 'Cards (front side only):'
                : 'Cards (back side only):';
        } else {
            cardsDescription = 'Available cards:';
        }

        const userMessage = `${promptsConfig.questionInstructions}

Quiz direction: ${direction}
${cardsDescription}
${vocabText}`;

        const response = await this.anthropic.messages.create({
            model: model,
            max_tokens: 1024,
            system: promptsConfig.systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

        const lines = responseText.split('\n');
        let prompt = '';

        for (const line of lines) {
            if (line.startsWith('PROMPT:')) {
                prompt = line.replace('PROMPT:', '').trim();
            }
        }

        return { question: responseText, prompt };
    }

    async evaluateAnswer(
        prompt: string,
        userAnswer: string,
        settings: QuizSettings
    ): Promise<{ feedbackFull: string; result: 'PASS' | 'FAIL'; feedbackText: string }> {
        const { promptsConfig, model } = settings;

        const evalMessage = `The question was:
"${prompt}"

The student's answer:
"${userAnswer}"

${promptsConfig.evaluationInstructions}`;

        const response = await this.anthropic.messages.create({
            model: model,
            max_tokens: 1024,
            system: promptsConfig.systemPrompt,
            messages: [{ role: 'user', content: evalMessage }],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

        const lines = responseText.split('\n');
        let result: 'PASS' | 'FAIL' = 'FAIL';
        let feedbackText = '';

        for (const line of lines) {
            if (line.startsWith('RESULT:')) {
                const val = line.replace('RESULT:', '').trim();
                if (val === 'PASS' || val === 'FAIL') result = val;
            } else if (line.startsWith('FEEDBACK:')) {
                feedbackText = line.replace('FEEDBACK:', '').trim();
            }
        }

        return { feedbackFull: responseText, result, feedbackText };
    }

    async generateCards(
        prompt: string,
        contextCards: VocabItem[],
        settings: QuizSettings
    ): Promise<{ front: string; back: string }[]> {
        const { model } = settings;

        let userMessage = prompt;

        // Append context cards if provided
        if (contextCards && contextCards.length > 0) {
            const cardsText = contextCards
                .map((c) => `Front: ${c.front} | Back: ${c.back}`)
                .join('\n');
            userMessage += `\n\nHere is the set of existing Anki cards:\n${cardsText}`;
        }

        // Append strict formatting instructions
        userMessage += `\n\nIMPORTANT: Please provide the output strictly as a JSON array of objects, where each object has "front" and "back" string fields. Do not include any other text, preamble, or markdown formatting outside the JSON structure.`;

        const response = await this.anthropic.messages.create({
            model: model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: userMessage }],
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

        // Attempt to parse JSON
        let jsonStr = responseText.trim();
        const jsonBlockMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || jsonStr.match(/```\n([\s\S]*?)\n```/);
        if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1];
        }

        try {
            const cards = JSON.parse(jsonStr);
            if (!Array.isArray(cards)) {
                throw new Error('Model response is not an array');
            }
            return cards;
        } catch {
            console.error('Failed to parse JSON', responseText);
            throw new Error(
                'Failed to parse model response as JSON. Response: ' + responseText.substring(0, 100) + '...'
            );
        }
    }
}
