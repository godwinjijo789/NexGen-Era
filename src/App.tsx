import React, { useState, useEffect } from 'react';
import { PageId, User, Quiz, GameSession, Participant } from './types';
import { StorageDB } from './services/db';
import { supabase } from './lib/supabase';
import { Navbar } from './components/Navbar';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HostDashboard } from './pages/HostDashboard';
import { CreateQuiz } from './pages/CreateQuiz';
import { MyQuizzes } from './pages/MyQuizzes';
import { QuizDetails } from './pages/QuizDetails';
import { StartLiveGame } from './pages/StartLiveGame';
import { HostGameScreen } from './pages/HostGameScreen';
import { JoinGame } from './pages/JoinGame';
import { StudentWaitingRoom } from './pages/StudentWaitingRoom';
import { StudentQuestionScreen } from './pages/StudentQuestionScreen';
import { QuestionResultScreen } from './pages/QuestionResultScreen';
import { FinalResults } from './pages/FinalResults';
import { QuizHistory } from './pages/QuizHistory';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfileSettings } from './pages/ProfileSettings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<PageId>(currentUser ? (currentUser.role === 'host' ? 'host_dashboard' : currentUser.role === 'admin' ? 'admin_dashboard' : 'join_game') : 'landing');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [quizBeingEdited, setQuizBeingEdited] = useState<Quiz | null>(null);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [realtimeError, setRealtimeError] = useState(false);

  // Sync active game across tabs
  useEffect(() => {
    const savedTheme = localStorage.getItem('nexgen_theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    let mounted = true;
    const handleRealtimeError = () => setRealtimeError(true);
    const handleRealtimeRestored = () => setRealtimeError(false);
    window.addEventListener('supabase_realtime_error', handleRealtimeError);
    window.addEventListener('supabase_realtime_restored', handleRealtimeRestored);
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        try {
          const user = await StorageDB.getProfile(session.user.id);
          if (user.isDisabled) {
            await supabase.auth.signOut();
            return;
          }
          await StorageDB.initialize(user);
          if (!mounted) return;
          setCurrentParticipant(StorageDB.getCurrentParticipant());
          setCurrentUser(user);
          const restoredGame = StorageDB.getActiveGame();
          setCurrentPage(user.role === 'host' ? 'host_dashboard' : user.role === 'admin' ? 'admin_dashboard' :
            restoredGame?.status === 'question_active' ? 'student_question_screen' :
              restoredGame?.status === 'question_result' || restoredGame?.status === 'leaderboard' ? 'question_result_screen' :
                restoredGame?.status === 'finished' ? 'final_results' : restoredGame ? 'student_waiting_room' : 'join_game');
        } catch {
          await supabase.auth.signOut();
        }
      }
    };
    void restoreSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        void StorageDB.initialize(null);
        setCurrentUser(null);
      }
    });
    const unsubscribe = StorageDB.subscribe(() => {
      setActiveGame(StorageDB.getActiveGame());
    });
    return () => {
      mounted = false;
      window.removeEventListener('supabase_realtime_error', handleRealtimeError);
      window.removeEventListener('supabase_realtime_restored', handleRealtimeRestored);
      authListener.subscription.unsubscribe();
      unsubscribe();
    };
  }, []);

  const handleLogin = (user: User) => {
    setCurrentParticipant(StorageDB.getCurrentParticipant());
    StorageDB.setCurrentUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    void supabase.auth.signOut();
    void StorageDB.initialize(null);
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        activeGame={activeGame}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {realtimeError && <div role="status" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">Live updates are temporarily unavailable. Reconnect or refresh to restore synchronization.</div>}
        {currentPage === 'landing' && <LandingPage setCurrentPage={setCurrentPage} currentUser={currentUser} />}
        {currentPage === 'login' && <LoginPage setCurrentPage={setCurrentPage} onLogin={handleLogin} />}
        {currentPage === 'register' && <RegisterPage setCurrentPage={setCurrentPage} onLogin={handleLogin} />}
        
        {currentPage === 'host_dashboard' && (
          <HostDashboard
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onSelectQuizForGame={setSelectedQuiz}
            onEditQuiz={quiz => {
              setQuizBeingEdited(quiz);
              setCurrentPage('edit_quiz');
            }}
          />
        )}

        {currentPage === 'create_quiz' && (
          <CreateQuiz
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onQuizSaved={setSelectedQuiz}
          />
        )}

        {currentPage === 'edit_quiz' && quizBeingEdited && (
          <CreateQuiz
            key={quizBeingEdited.quizId}
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onQuizSaved={setSelectedQuiz}
            quiz={quizBeingEdited}
          />
        )}

        {currentPage === 'my_quizzes' && (
          <MyQuizzes
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onSelectQuiz={setSelectedQuiz}
            onEditQuiz={quiz => {
              setQuizBeingEdited(quiz);
              setCurrentPage('edit_quiz');
            }}
          />
        )}

        {currentPage === 'quiz_details' && (
          <QuizDetails
            quiz={selectedQuiz}
            setCurrentPage={setCurrentPage}
            onSelectQuizForGame={setSelectedQuiz}
          />
        )}

        {currentPage === 'start_live_game' && (
          <StartLiveGame
            quiz={selectedQuiz}
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onGameStarted={setActiveGame}
          />
        )}

        {currentPage === 'host_game_screen' && (
          <HostGameScreen
            game={activeGame}
            quiz={selectedQuiz}
            setCurrentPage={setCurrentPage}
            onEndGame={() => setActiveGame(null)}
          />
        )}

        {currentPage === 'join_game' && (
          <JoinGame
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onJoinedGame={setCurrentParticipant}
          />
        )}

        {currentPage === 'student_waiting_room' && (
          <StudentWaitingRoom
            participant={currentParticipant}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'student_question_screen' && (
          <StudentQuestionScreen
            participant={currentParticipant}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'question_result_screen' && (
          <QuestionResultScreen
            participant={currentParticipant}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'final_results' && (
          <FinalResults
            quiz={selectedQuiz}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'quiz_history' && (
          <QuizHistory
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'admin_dashboard' && (
          <AdminDashboard
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onEditQuiz={quiz => {
              setQuizBeingEdited(quiz);
              setCurrentPage('edit_quiz');
            }}
          />
        )}

        {currentPage === 'profile_settings' && (
          <ProfileSettings
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onUserUpdated={setCurrentUser}
          />
        )}
      </main>
    </div>
  );
}
