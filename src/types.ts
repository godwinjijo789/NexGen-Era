export type UserRole = 'host' | 'participant' | 'admin';

export interface User {
  userId: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  participantId?: string;
  avatar?: string;
  createdAt: string;
  isDisabled?: boolean;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  text: string;
  options: string[]; // 2 to 5 options
  correctAnswer: number; // Index of correct option
  timerSeconds: number; // 5, 10, 20, 30, 60
  difficulty: Difficulty;
  imageUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface Quiz {
  quizId: string;
  hostId: string;
  title: string;
  description?: string;
  stream: string;
  subject?: string;
  difficulty: Difficulty;
  showQuestionAndAnswersToParticipants?: boolean;
  showMediaToParticipants?: boolean;
  questions: Question[];
  createdAt: string;
  updatedAt?: string;
}

export type GameStatus = 'waiting' | 'question_active' | 'question_result' | 'leaderboard' | 'finished';

export interface GameSession {
  gameId: string;
  quizId: string;
  hostId: string;
  gamePin: string; // 6 digits
  status: GameStatus;
  currentQuestionIndex: number;
  questionStartTime?: number; // timestamp when current question started
  startedAt: string;
  endedAt?: string;
  quiz?: Quiz;
}

export interface Participant {
  participantId: string;
  gameId: string;
  nickname: string;
  studentId?: string;
  avatar?: string;
  score: number;
  correctAnswers: number;
  rank: number;
  joinedAt: string;
  isOnline: boolean;
}

export interface Response {
  responseId: string;
  gameId: string;
  participantId: string;
  questionId: string;
  selectedAnswer: number; // 0, 1, 2, 3 (-1 if timeout)
  isCorrect: boolean;
  responseTime: number; // seconds taken
  points: number;
  submittedAt: string;
}

export interface GameHistoryRecord {
  historyId: string;
  gameId: string;
  quizTitle: string;
  hostName: string;
  totalParticipants: number;
  startedAt: string;
  endedAt: string;
  winnerName?: string;
  winnerScore?: number;
  participants: Participant[];
}

export type PageId =
  | 'landing'
  | 'login'
  | 'register'
  | 'host_dashboard'
  | 'create_quiz'
  | 'edit_quiz'
  | 'my_quizzes'
  | 'quiz_details'
  | 'start_live_game'
  | 'host_game_screen'
  | 'join_game'
  | 'student_waiting_room'
  | 'student_question_screen'
  | 'question_result_screen'
  | 'leaderboard'
  | 'final_results'
  | 'quiz_history'
  | 'admin_dashboard'
  | 'profile_settings';
