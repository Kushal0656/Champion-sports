import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import InningsPage from "./pages/InningsPage";
import DashboardPage from "./pages/DashboardPage";
import TeamsPage from "./pages/TeamsPage";
import PlayersPage from "./pages/PlayersPage";
import MatchesPage from "./pages/MatchesPage";
import LiveScoringPage from "./pages/LiveScoringPage";
import TournamentPage from "./pages/TournamentPage";
import PointsTablePage from "./pages/PointsTablePage";
import LoginPage from "./pages/LoginPage";
import BattingScorecardPage from "./pages/BattingScorecardPage";
import BowlingScorecardPage from "./pages/BowlingScorecardPage";
import TournamentTeamsPage
from "./pages/TournamentTeamsPage";
import OverlayScoreBar
from "./pages/OverlayScoreBar";
import ScorecardPage from "./pages/ScorecardPage";
import StreamOverlayStudio from "./pages/StreamOverlayStudio";
import LiveOverlayViewer from "./pages/LiveOverlayViewer";
import ApiKeysPage from "./pages/ApiKeysPage";
import { isAdminLoggedIn } from "./utils/auth";

function AdminRoute({ children }) {
  return isAdminLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/players" element={<AdminRoute><PlayersPage /></AdminRoute>} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/tournament" element={<AdminRoute><TournamentPage /></AdminRoute>} />
        <Route path="/live-scoring" element={<AdminRoute><LiveScoringPage /></AdminRoute>} />
        <Route path="/points-table" element={<PointsTablePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/innings" element={<InningsPage />} />
        <Route
          path="/batting-scorecard"
          element={
            <BattingScorecardPage />
          }
        />
        <Route
          path="/bowling-scorecard"
          element={
            <BowlingScorecardPage />
          }
        />
        <Route
          path="/tournament-teams"
          element={
            <AdminRoute><TournamentTeamsPage /></AdminRoute>
          }
        />
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/overlay"
          element={<OverlayScoreBar />}
        />
        <Route
          path="/overlay-studio"
          element={<AdminRoute><StreamOverlayStudio /></AdminRoute>}
        />
        <Route
          path="/overlay/live-score"
          element={<LiveOverlayViewer sceneId="live-match" />}
        />
        <Route
          path="/overlay/toss"
          element={<LiveOverlayViewer sceneId="toss" />}
        />
        <Route
          path="/overlay/result"
          element={<LiveOverlayViewer sceneId="result" />}
        />
        <Route
          path="/overlay/match-start"
          element={<LiveOverlayViewer sceneId="match-start" />}
        />
        <Route
          path="/overlay/innings-break"
          element={<LiveOverlayViewer sceneId="innings-break" />}
        />
        <Route
          path="/overlay/advertisement"
          element={<LiveOverlayViewer sceneId="advertisement" />}
        />
        <Route
          path="/overlay/presentation"
          element={<LiveOverlayViewer sceneId="presentation" />}
        />
        <Route
          path="/overlay/:sceneId"
          element={<LiveOverlayViewer />}
        />
        <Route
          path="/scorecard"
          element={<ScorecardPage />}
        />
        <Route
          path="/api-keys"
          element={<AdminRoute><ApiKeysPage /></AdminRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}