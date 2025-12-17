import type { VocabItem, ReviewNote, AnkiCardStats } from "./types";

export const DEFAULT_ANKI_URL = "http://localhost:8765";

interface AnkiFieldData {
  value: string;
  order: number;
}

export async function invokeAnkiConnect(
  action: string,
  params: Record<string, unknown> = {},
  url: string = DEFAULT_ANKI_URL
) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        version: 6,
        params: params || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error);
    }

    return result.result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        throw new Error(
          `Cannot connect to Anki-Connect at ${url}. Please make sure Anki is running and configured to allow this origin.`
        );
      }
    }
    throw error;
  }
}

export async function loadVocabulary(
  maxWords: number,
  deckFilter: string,
  url: string
): Promise<VocabItem[]> {
  const query = deckFilter ? `deck:${deckFilter}` : "*";
  const noteIds = await invokeAnkiConnect("findNotes", { query }, url);

  if (!noteIds || noteIds.length === 0) {
    return [];
  }

  const notesInfo = await invokeAnkiConnect(
    "notesInfo",
    { notes: noteIds },
    url
  );

  const vocabulary: VocabItem[] = [];
  for (const note of notesInfo) {
    const fields = note.fields || {};
    let front = "";
    let back = "";

    // Iterate over fields to find order 0 and 1
    for (const [, fieldData] of Object.entries(fields)) {
      const field = fieldData as { order: number; value: string };
      if (field.order === 0) {
        front = field.value.trim();
      } else if (field.order === 1) {
        back = field.value.trim();
      }
    }

    if (front && back) {
      vocabulary.push({ front, back });
    }
  }

  const shuffled = vocabulary.sort(() => Math.random() - 0.5);
  const limited = shuffled.slice(0, maxWords);

  return limited;
}

export async function getReviewNotes(
  maxWords: number,
  deckFilter: string,
  url: string
): Promise<ReviewNote[]> {
  const query = deckFilter ? `deck:${deckFilter}` : "*";
  const noteIds = await invokeAnkiConnect("findNotes", { query }, url);

  if (!noteIds || noteIds.length === 0) {
    return [];
  }

  const shuffledNoteIds = (noteIds as number[])
    .sort(() => Math.random() - 0.5)
    .slice(0, maxWords);
  const notesInfo = await invokeAnkiConnect(
    "notesInfo",
    { notes: shuffledNoteIds },
    url
  );

  let allCardIds: number[] = [];
  for (const note of notesInfo) {
    if (note.cards) {
      allCardIds = allCardIds.concat(note.cards);
    }
  }

  const cardsInfo = await invokeAnkiConnect(
    "cardsInfo",
    { cards: allCardIds },
    url
  );
  const cardsMap = new Map<number, AnkiCardStats>();
  for (const card of cardsInfo) {
    cardsMap.set(card.cardId, card);
  }

  const reviewNotes: ReviewNote[] = [];
  for (const note of notesInfo) {
    const fields = note.fields || {};
    let front = "";
    let frontFieldName = "";
    let back = "";
    let backFieldName = "";

    const allFields = Object.entries(fields as Record<string, AnkiFieldData>)
      .map(([name, data]) => ({
        name,
        value: data.value,
        order: data.order,
      }))
      .sort((a, b) => a.order - b.order);

    if (allFields.length > 0) {
      front = allFields[0].value;
      frontFieldName = allFields[0].name;
    }
    if (allFields.length > 1) {
      back = allFields[1].value;
      backFieldName = allFields[1].name;
    }

    if (!front && !back) continue;

    const noteCards = note.cards || [];
    const statsList: AnkiCardStats[] = noteCards
      .map((id: number) => cardsMap.get(id))
      .filter((s: AnkiCardStats | undefined): s is AnkiCardStats => !!s);

    let minInterval = Infinity;
    let sumReviews = 0;
    let minFactor = Infinity;
    let maxLapses = 0;

    if (statsList.length === 0) {
      reviewNotes.push({
        noteId: note.noteId,
        front,
        frontFieldName,
        back,
        backFieldName,
        tags: note.tags,
        stats: {
          grade: "New",
          color: "blue",
          summary: "New Note",
          details: "No cards found",
        },
      });
      continue;
    }

    for (const stat of statsList) {
      const interval = Number(stat.interval);
      const factor = Number(stat.factor);
      const reps = Number(stat.reps);
      const lapses = Number(stat.lapses);

      if (!isNaN(interval) && interval < minInterval) minInterval = interval;
      if (!isNaN(factor) && factor < minFactor) minFactor = factor;
      if (!isNaN(lapses) && lapses > maxLapses) maxLapses = lapses;
      if (!isNaN(reps)) sumReviews += reps;
    }

    let grade = "N";
    let color = "gray";

    if (statsList.some((s) => s.queue === 0 || s.type === 0)) {
      grade = "New";
      color = "blue";
    } else if (maxLapses > 8 || minFactor < 1300) {
      grade = "F";
      color = "red";
    } else if (minInterval < 2) {
      grade = "D";
      color = "orange";
    } else if (minInterval < 7) {
      grade = "C";
      color = "yellow";
    } else if (minInterval < 21) {
      grade = "B";
      color = "lime";
    } else if (minInterval < 60) {
      grade = "A";
      color = "green";
    } else {
      grade = "S";
      color = "emerald";
    }

    const summary = `Interval: ${
      minInterval === Infinity ? 0 : minInterval
    }d | Reviews: ${sumReviews}`;
    const details = statsList
      .map(
        (s) =>
          `Card ${s.cardId}:\n- Interval: ${s.interval}d\n- Ease Factor: ${
            s.factor / 10
          }%\n- Reviews: ${s.reps}\n- Lapses: ${s.lapses}`
      )
      .join("\n\n");

    reviewNotes.push({
      noteId: note.noteId,
      front,
      frontFieldName,
      back,
      backFieldName,
      tags: note.tags,
      stats: { grade, color, summary, details },
    });
  }

  return reviewNotes;
}

export async function addNote(
  front: string,
  back: string,
  deckName: string,
  modelName: string,
  url: string,
  tags?: string[]
): Promise<{ result: number; fieldNames: string[] }> {
  const fields = await invokeAnkiConnect("modelFieldNames", { modelName }, url);
  if (!fields || fields.length < 2) {
    throw new Error(`Model ${modelName} does not have enough fields`);
  }

  const note = {
    deckName,
    modelName,
    fields: {
      [fields[0]]: front,
      [fields[1]]: back,
    },
    tags: tags || [],
  };

  const result = await invokeAnkiConnect("addNote", { note }, url);
  return { result, fieldNames: fields };
}

export async function updateNote(
  noteId: number,
  fields: Record<string, string>,
  url: string
) {
  const note = {
    id: noteId,
    fields,
  };
  return await invokeAnkiConnect("updateNoteFields", { note }, url);
}

export async function deleteNote(
  noteId: number,
  url: string
) {
  return await invokeAnkiConnect("deleteNotes", { notes: [noteId] }, url);
}
