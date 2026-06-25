import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import RepoDetail from './pages/RepoDetail';
import CommitsPage from './pages/CommitsPage';
import PRDetailPage from './pages/PRDetailPage';
import UserSettingsPage from './pages/UserSettingsPage';
import Explore from './pages/Explore';
import NewRepo from './pages/NewRepo';

const Home = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Dashboard /> : <Landing />;
};

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/new" element={<Protected><NewRepo /></Protected>} />
            <Route path="/settings" element={<Protected><UserSettingsPage /></Protected>} />
            <Route path="/:username" element={<Profile />} />
            <Route path="/:username/:repo/commits" element={<CommitsPage />} />
            <Route path="/:username/:repo/pulls/:number" element={<PRDetailPage />} />
            <Route path="/:username/:repo" element={<RepoDetail />} />
            <Route path="/:username/:repo/:tab" element={<RepoDetail />} />
          </Routes>
          <Toaster position="bottom-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
