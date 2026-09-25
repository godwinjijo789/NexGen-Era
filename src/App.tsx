import React, { useState, useEffect } from 'react';
import { PageId, User, Quiz, GameSession, Participant } from './types';
import { StorageDB } from './services/db';
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
  const [currentUser, setCurrentUser] = useState<User | null>(StorageDB.getCurrentUser());
  const [currentPage, setCurrentPage] = useState<PageId>(currentUser ? (currentUser.role === 'host' ? 'host_dashboard' : currentUser.role === 'admin' ? 'admin_dashboard' : 'join_game') : 'landing');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [activeGame, setActiveGame] = useState<GameSession | null>(StorageDB.getActiveGame());
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);

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

    const unsubscribe = StorageDB.subscribe(() => {
      setActiveGame(StorageDB.getActiveGame());
    });
    return unsubscribe;
  }, []);

  const handleLogin = (user: User) => {
    StorageDB.setCurrentUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    StorageDB.setCurrentUser(null);
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
        {currentPage === 'landing' && <LandingPage setCurrentPage={setCurrentPage} currentUser={currentUser} />}
        {currentPage === 'login' && <LoginPage setCurrentPage={setCurrentPage} onLogin={handleLogin} />}
        {currentPage === 'register' && <RegisterPage setCurrentPage={setCurrentPage} onLogin={handleLogin} />}
        
        {currentPage === 'host_dashboard' && (
          <HostDashboard
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onSelectQuizForGame={setSelectedQuiz}
          />
        )}

        {currentPage === 'create_quiz' && (
          <CreateQuiz
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onQuizSaved={setSelectedQuiz}
          />
        )}

        {currentPage === 'my_quizzes' && (
          <MyQuizzes
            currentUser={currentUser}
            setCurrentPage={setCurrentPage}
            onSelectQuiz={setSelectedQuiz}
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
