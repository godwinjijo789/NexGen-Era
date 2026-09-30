import React, { lazy, Suspense, useState, useEffect } from 'react';
import { PageId, User, Quiz, GameSession, Participant } from './types';
import { StorageDB } from './services/db';
import { supabase } from './lib/supabase';
import { Navbar } from './components/Navbar';

const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const HostDashboard = lazy(() => import('./pages/HostDashboard').then(module => ({ default: module.HostDashboard })));
const CreateQuiz = lazy(() => import('./pages/CreateQuiz').then(module => ({ default: module.CreateQuiz })));
const MyQuizzes = lazy(() => import('./pages/MyQuizzes').then(module => ({ default: module.MyQuizzes })));
const QuizDetails = lazy(() => import('./pages/QuizDetails').then(module => ({ default: module.QuizDetails })));
const StartLiveGame = lazy(() => import('./pages/StartLiveGame').then(module => ({ default: module.StartLiveGame })));
const HostGameScreen = lazy(() => import('./pages/HostGameScreen').then(module => ({ default: module.HostGameScreen })));
const JoinGame = lazy(() => import('./pages/JoinGame').then(module => ({ default: module.JoinGame })));
const StudentWaitingRoom = lazy(() => import('./pages/StudentWaitingRoom').then(module => ({ default: module.StudentWaitingRoom })));
const StudentQuestionScreen = lazy(() => import('./pages/StudentQuestionScreen').then(module => ({ default: module.StudentQuestionScreen })));
const QuestionResultScreen = lazy(() => import('./pages/QuestionResultScreen').then(module => ({ default: module.QuestionResultScreen })));
const FinalResults = lazy(() => import('./pages/FinalResults').then(module => ({ default: module.FinalResults })));
const QuizHistory = lazy(() => import('./pages/QuizHistory').then(module => ({ default: module.QuizHistory })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings').then(module => ({ default: module.ProfileSettings })));

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
        let user: User;
        try {
          user = await StorageDB.getProfile(session.user.id);
        } catch (error) {
          console.error('Unable to restore the signed-in profile:', error);
          return;
        }
        if (user.isDisabled) {
          await supabase.auth.signOut();
          return;
        }

        try {
          await StorageDB.initialize(user);
        } catch (error) {
          console.error('Unable to load signed-in app data:', error);
          if (!mounted) return;
          setCurrentUser(user);
          setCurrentPage(user.role === 'host' ? 'host_dashboard' : user.role === 'admin' ? 'admin_dashboard' : 'join_game');
          return;
        }

        if (!mounted) return;
        setCurrentParticipant(StorageDB.getCurrentParticipant());
        setCurrentUser(user);
        const restoredGame = StorageDB.getActiveGame();
        setCurrentPage(user.role === 'host' ? 'host_dashboard' : user.role === 'admin' ? 'admin_dashboard' :
          restoredGame?.status === 'question_active' ? 'student_question_screen' :
            restoredGame?.status === 'question_result' || restoredGame?.status === 'leaderboard' ? 'question_result_screen' :
              restoredGame?.status === 'finished' ? 'final_results' : restoredGame ? 'student_waiting_room' : 'join_game');
      }
    };
    void restoreSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        void StorageDB.initialize(null);
        setCurrentParticipant(null);
        setCurrentUser(null);
        setCurrentPage('landing');
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
        {realtimeError && <div role="status" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">Realtime is temporarily unavailable. Game state is syncing automatically until the connection recovers.</div>}
        <Suspense fallback={<div role="status" className="min-h-[40vh] flex items-center justify-center text-sm text-slate-400">Loading page...</div>}>
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
            isHost={currentUser?.role === 'host'}
            isParticipant={currentParticipant !== null}
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
        </Suspense>
      </main>
    </div>
  );
}
