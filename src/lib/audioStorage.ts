/**
 * @module audioStorage
 * IndexedDB-based audio recording storage for pronunciation exercises.
 * Provides async CRUD operations for storing, retrieving, and managing
 * recorded audio blobs with metadata (courseId, lessonIndex, phrase, score).
 */

export interface AudioRecording {
  id: string;
  sessionId: string;
  courseId: string;
  lessonIndex: number;
  timestamp: string;
  blob: Blob;
  duration: number;
  transcript: string;
  expectedText?: string;
  pronunciationScore?: number;
  language: string;
}

/** ProgressData interface. */
export interface ProgressData {
  date: string;
  avgScore: number;
  exerciseCount: number;
}

const DB_NAME = 'bartalk_audio';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

/**
 * Opens or creates the IndexedDB database with audio recordings
 */
export async function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

        // Create indexes for querying
        objectStore.createIndex('sessionId', 'sessionId', { unique: false });
        objectStore.createIndex('courseId', 'courseId', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Saves an audio recording to IndexedDB
 */
export async function saveRecording(recording: AudioRecording): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(recording);

    request.onerror = () => {
      reject(new Error(`Failed to save recording: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error(`Transaction error: ${transaction.error}`));
    };
  });
}

/**
 * Retrieves all recordings for a specific session
 */
export async function getRecordingsForSession(sessionId: string): Promise<AudioRecording[]> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('sessionId');
    const request = index.getAll(sessionId);

    request.onerror = () => {
      reject(new Error(`Failed to retrieve recordings: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    transaction.onerror = () => {
      reject(new Error(`Transaction error: ${transaction.error}`));
    };
  });
}

/**
 * Retrieves all recordings for a specific course
 */
export async function getRecordingsForCourse(courseId: string): Promise<AudioRecording[]> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('courseId');
    const request = index.getAll(courseId);

    request.onerror = () => {
      reject(new Error(`Failed to retrieve recordings: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    transaction.onerror = () => {
      reject(new Error(`Transaction error: ${transaction.error}`));
    };
  });
}

/**
 * Deletes a recording by ID
 */
export async function deleteRecording(id: string): Promise<void> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.delete(id);

    request.onerror = () => {
      reject(new Error(`Failed to delete recording: ${request.error}`));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(new Error(`Transaction error: ${transaction.error}`));
    };
  });
}

/**
 * Retrieves a specific recording blob by ID
 */
export async function getRecordingBlob(id: string): Promise<Blob | null> {
  const db = await openAudioDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(id);

    request.onerror = () => {
      reject(new Error(`Failed to retrieve recording: ${request.error}`));
    };

    request.onsuccess = () => {
      const recording = request.result as AudioRecording | undefined;
      resolve(recording?.blob ?? null);
    };

    transaction.onerror = () => {
      reject(new Error(`Transaction error: ${transaction.error}`));
    };
  });
}

/**
 * Aggregates pronunciation scores by date for progress timeline
 * Returns daily statistics for a course
 */
export async function getProgressData(courseId: string): Promise<ProgressData[]> {
  const recordings = await getRecordingsForCourse(courseId);

  // Group by date
  const groupedByDate = new Map<string, { scores: number[]; count: number }>();

  for (const recording of recordings) {
    const date = new Date(recording.timestamp).toISOString().split('T')[0];

    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, { scores: [], count: 0 });
    }

    const dayData = groupedByDate.get(date)!;
    dayData.count += 1;

    if (recording.pronunciationScore !== undefined) {
      dayData.scores.push(recording.pronunciationScore);
    }
  }

  // Calculate daily averages
  const progressData: ProgressData[] = [];
  groupedByDate.forEach((dayData, date) => {
    const avgScore =
      dayData.scores.length > 0 ? dayData.scores.reduce((a, b) => a + b, 0) / dayData.scores.length : 0;

    progressData.push({
      date,
      avgScore,
      exerciseCount: dayData.count,
    });
  });

  // Sort by date ascending
  progressData.sort((a, b) => a.date.localeCompare(b.date));

  return progressData;
}
