import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Question, Difficulty } from '../types';

export async function generateQuizWithAI(topic: string, count: number = 5, difficulty: Difficulty = 'Medium'): Promise<Question[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY || '';
  
  // If no API key is present or in offline mode, return rich mock AI generated questions
  if (!apiKey) {
    return generateFallbackQuestions(topic, count, difficulty);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a multiple-choice quiz about "${topic}" containing exactly ${count} questions. Difficulty level: ${difficulty}. Each question must have 4 distinct options, the index of the correct answer (0 to 3), an appropriate timer in seconds (10, 20, 30, or 60), and the difficulty level ('Easy', 'Medium', or 'Hard').`;

    const responseSchema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: 'The question text' },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array of exactly 4 answer choices'
          },
          correctAnswer: { type: Type.INTEGER, description: 'Index of correct answer (0, 1, 2, or 3)' },
          timerSeconds: { type: Type.INTEGER, description: 'Timer in seconds: 10, 20, 30, or 60' },
          difficulty: { type: Type.STRING, description: 'Easy, Medium, or Hard' }
        },
        required: ['text', 'options', 'correctAnswer', 'timerSeconds', 'difficulty']
      }
    };

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7
      }
    });

    const text = result.text;
    if (!text) throw new Error('No response from Gemini');
    
    const parsed = JSON.parse(text);
    return parsed.map((q: any, idx: number) => ({
      id: `ai_q_${Date.now()}_${idx}`,
      text: q.text,
      options: q.options.slice(0, 4) as [string, string, string, string],
      correctAnswer: Math.min(Math.max(0, q.correctAnswer), 3) as 0 | 1 | 2 | 3,
      timerSeconds: [10, 20, 30, 60].includes(q.timerSeconds) ? q.timerSeconds : 20,
      difficulty: (['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : difficulty) as Difficulty,
      imageUrl: getRandomTopicImage(topic, idx)
    }));
  } catch (err) {
    console.error('Gemini AI generation failed, using fallback:', err);
    return generateFallbackQuestions(topic, count, difficulty);
  }
}

function getRandomTopicImage(topic: string, index: number): string {
  const images = [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'
  ];
  return images[index % images.length];
}

function generateFallbackQuestions(topic: string, count: number, difficulty: Difficulty): Question[] {
  const fallbackList: Question[] = [];
  for (let i = 1; i <= count; i++) {
    fallbackList.push({
      id: `fallback_q_${Date.now()}_${i}`,
      text: `Question ${i}: Which of the following is a core principle or fact regarding ${topic}?`,
      options: [
        `Primary fundamental concept of ${topic} A`,
        `Advanced specialized property B`,
        `Historical misconception C`,
        `Unrelated outlier D`
      ],
      correctAnswer: 0,
      timerSeconds: 20,
      difficulty,
      imageUrl: getRandomTopicImage(topic, i)
    });
  }
  return fallbackList;
}
