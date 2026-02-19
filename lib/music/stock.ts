/**
 * Stock Music Library for Cinematic Videos
 * 
 * Provides royalty-free background music URLs organized by genre and mood.
 * Used in cinematic video generation for ambient audio tracks.
 */

export type MusicGenre = 
  | 'cinematic'
  | 'ambient'
  | 'electronic'
  | 'lofi'
  | 'orchestral'
  | 'corporate'
  | 'pop'
  | 'rock';

export type MusicMood = 
  | 'epic'
  | 'calm'
  | 'dramatic'
  | 'energetic'
  | 'happy'
  | 'dark'
  | 'mysterious'
  | 'uplifting';

// Stock music URLs organized by genre and mood
// Using royalty-free music from Pixabay (public domain)
const STOCK_MUSIC: Record<string, Record<string, string>> = {
  cinematic: {
    epic: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    dramatic: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3',
    mysterious: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946bc0a7e3.mp3',
    calm: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  },
  ambient: {
    calm: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    dark: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946bc0a7e3.mp3',
    mysterious: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946bc0a7e3.mp3',
    uplifting: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  electronic: {
    energetic: 'https://cdn.pixabay.com/audio/2022/10/12/audio_b94d0c95c8.mp3',
    epic: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    dark: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946bc0a7e3.mp3',
    uplifting: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
  },
  lofi: {
    calm: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    happy: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
  },
  orchestral: {
    epic: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    dramatic: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3',
    uplifting: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
  },
  corporate: {
    uplifting: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
    energetic: 'https://cdn.pixabay.com/audio/2022/10/12/audio_b94d0c95c8.mp3',
    calm: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
  },
  pop: {
    happy: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
    energetic: 'https://cdn.pixabay.com/audio/2022/10/12/audio_b94d0c95c8.mp3',
    uplifting: 'https://cdn.pixabay.com/audio/2022/03/10/audio_3e22b2b24c.mp3',
  },
  rock: {
    energetic: 'https://cdn.pixabay.com/audio/2022/10/12/audio_b94d0c95c8.mp3',
    epic: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
    dark: 'https://cdn.pixabay.com/audio/2022/10/25/audio_946bc0a7e3.mp3',
  },
};

/**
 * Get a music URL for the given genre and mood
 */
export function getMusicUrl(genre: string, mood: string): string | null {
  const genreMusic = STOCK_MUSIC[genre.toLowerCase()];
  if (!genreMusic) {
    return null;
  }
  return genreMusic[mood.toLowerCase()] || null;
}

/**
 * Get all available genres
 */
export function getAvailableGenres(): string[] {
  return Object.keys(STOCK_MUSIC);
}

/**
 * Get available moods for a genre
 */
export function getAvailableMoods(genre: string): string[] {
  const genreMusic = STOCK_MUSIC[genre.toLowerCase()];
  if (!genreMusic) {
    return [];
  }
  return Object.keys(genreMusic);
}

/**
 * Get all music options as a flat list
 */
export function getAllMusicOptions(): Array<{ genre: string; mood: string; url: string }> {
  const options: Array<{ genre: string; mood: string; url: string }> = [];
  
  for (const [genre, moods] of Object.entries(STOCK_MUSIC)) {
    for (const [mood, url] of Object.entries(moods)) {
      options.push({ genre, mood, url });
    }
  }
  
  return options;
}
