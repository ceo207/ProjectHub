import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { initDB } from "@/db";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import WorkLogs from "@/pages/WorkLogs";
import HardwareCosts from "@/pages/HardwareCosts";
export default function App() {
  const { t } = useTranslation();
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDB()
      .then(() => setDbReady(true))
      .catch((err) => setError(String(err)));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8">
        <div className="text-destructive text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">{t("app.dbError")}</h2>
          <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded-md">{error}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{t("app.loading")}</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/employees"      element={<Employees />} />
          <Route path="/projects"       element={<Projects />} />
          <Route path="/projects/:id"   element={<ProjectDetails />} />
          <Route path="/work-logs"      element={<WorkLogs />} />
          <Route path="/hardware-costs" element={<HardwareCosts />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
