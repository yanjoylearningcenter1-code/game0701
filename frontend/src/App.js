import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { initPushNotifications } from "@/lib/push";
import { setPushNavigator } from "@/lib/pushRouter";

import LandingPage from "@/pages/LandingPage";
import IdentitySelectionPage from "@/pages/IdentitySelectionPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import UploadPage from "@/pages/UploadPage";
import PreviewPage from "@/pages/PreviewPage";
import JourneyPage from "@/pages/JourneyPage";
import ModeSelectionPage from "@/pages/ModeSelectionPage";
import AssignTargetPage from "@/pages/AssignTargetPage";
import TransformationPage from "@/pages/TransformationPage";
import BattlePage from "@/pages/BattlePage";
import VictoryPage from "@/pages/VictoryPage";
import KidHomePage from "@/pages/KidHomePage";
import FreePlayPage from "@/pages/FreePlayPage";
import SettingsPage from "@/pages/SettingsPage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import FamilyCodePage from "@/pages/FamilyCodePage";
import ConsentConfirmPage from "@/pages/ConsentConfirmPage";
import KidProfilePage from "@/pages/KidProfilePage";
import SkillsPage from "@/pages/SkillsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ParentDashboard from "@/pages/ParentDashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import JoinRaidPage from "@/pages/JoinRaidPage";
import StudentRaidPage from "@/pages/StudentRaidPage";
import TeacherLiveRaidPage from "@/pages/TeacherLiveRaidPage";
import ParentalGate from "@/components/ParentalGate";
import { GameFeelProvider } from "@/lib/gameFeel";

function PushBootstrap() {
  const navigate = useNavigate();
  useEffect(() => {
    setPushNavigator(navigate);
    initPushNotifications();
  }, [navigate]);
  return null;
}

function AppRouter() {
  return (
    <>
      <PushBootstrap />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/identity" element={<ParentalGate><IdentitySelectionPage /></ParentalGate>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/preview" element={<PreviewPage />} />
      <Route path="/mode" element={<ModeSelectionPage />} />
      <Route path="/assign-target" element={<AssignTargetPage />} />
      <Route path="/transform" element={<TransformationPage />} />
      <Route path="/battle" element={<BattlePage />} />
      <Route path="/victory" element={<VictoryPage />} />
      <Route path="/home" element={<KidHomePage />} />
      <Route path="/journey/:trackId" element={<JourneyPage />} />
      <Route path="/profile" element={<KidProfilePage />} />
      <Route path="/skills" element={<SkillsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/family-code" element={<ParentalGate><FamilyCodePage /></ParentalGate>} />
      <Route path="/consent/confirm" element={<ConsentConfirmPage />} />
      <Route path="/free-play" element={<FreePlayPage />} />
      <Route path="/join" element={<JoinRaidPage />} />
      <Route path="/raid/:roomCode" element={<StudentRaidPage />} />
      <Route path="/teacher/raid/:roomCode" element={<ParentalGate><TeacherLiveRaidPage /></ParentalGate>} />
      <Route path="/parent" element={<ParentalGate><ParentDashboard /></ParentalGate>} />
      <Route path="/teacher" element={<ParentalGate><TeacherDashboard /></ParentalGate>} />
    </Routes>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <GameFeelProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-center" richColors />
          </BrowserRouter>
        </GameFeelProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
