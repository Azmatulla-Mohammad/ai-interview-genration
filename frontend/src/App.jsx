import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { PrivateRoute } from "./components/PrivateRoute";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AnswerPage } from "./pages/AnswerPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GeneratePage } from "./pages/GeneratePage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { QuestionsPage } from "./pages/QuestionsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResultPage } from "./pages/ResultPage";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/:questionId" element={<AnswerPage />} />
          <Route path="/results/:evaluationId" element={<ResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
