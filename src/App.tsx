import { useState } from "react";
import type { PageKey, User } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { PAGE_TITLES, SIDEBAR_ACTIVE_KEY } from "./components/layout/navConfig";
import { USERS } from "./mock/users";

import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { ProjectDetailPage } from "./pages/ProjectDetail";

function PagePlaceholder({ name }: { name: string }) {
  return (
    <div className="p-8">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
        <p className="text-sm text-slate-500 mt-2">
          This page is being migrated to the new Vite + TypeScript project structure.
          The wiring (sidebar, top bar, mock data, types, status styles) is already in place —
          page bodies are next.
        </p>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [currentUserId, setCurrentUserId] = useState<string>("U001"); // Sarah Mitchell, PMO
  const [showMobile, setShowMobile] = useState(false);

  // For drill-through navigation
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const currentUser: User = USERS.find((u) => u.id === currentUserId)!;
  const sidebarActive = SIDEBAR_ACTIVE_KEY[page];

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPage("project-detail");
  };

  let body: React.ReactNode;
  switch (page) {
    case "dashboard":
      body = (
        <DashboardPage
          currentUser={currentUser}
          onNav={setPage}
          onOpenProject={openProject}
        />
      );
      break;
    case "projects":
      body = <ProjectsPage onOpen={openProject} />;
      break;
    case "project-detail":
      body = selectedProjectId ? (
        <ProjectDetailPage
          projectId={selectedProjectId}
          onBack={() => setPage("projects")}
        />
      ) : (
        <ProjectsPage onOpen={openProject} />
      );
      break;
    case "vehicles":        body = <PagePlaceholder name="Vehicles" />; break;
    case "vehicle-detail":  body = <PagePlaceholder name="Vehicle Detail" />; break;
    case "vehicle-check":   body = <PagePlaceholder name="Vehicle Check" />; break;
    case "plates":          body = <PagePlaceholder name="Trade Plates" />; break;
    case "plate-timeline":  body = <PagePlaceholder name="Plate Allocation Timeline" />; break;
    case "routes":          body = <PagePlaceholder name="Routes" />; break;
    case "pois":            body = <PagePlaceholder name="POIs" />; break;
    case "tasks":           body = <PagePlaceholder name="Daily Tasks" />; break;
    case "staff":           body = <PagePlaceholder name="Staff Assignment" />; break;
    case "attendance":      body = <PagePlaceholder name="Attendance" />; break;
    case "issues":          body = <PagePlaceholder name="Issues & Risks" />; break;
    case "expenses":        body = <PagePlaceholder name="Expenses" />; break;
    case "files":           body = <PagePlaceholder name="Files" />; break;
    case "users":           body = <PagePlaceholder name="Users & Roles" />; break;
    case "settings":        body = <PagePlaceholder name="Settings" />; break;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        active={sidebarActive}
        onNav={setPage}
        currentUser={currentUser}
        onSwitchUser={setCurrentUserId}
      />
      <div className="flex-1 flex flex-col">
        <TopBar
          pageTitle={PAGE_TITLES[page]}
          currentUser={currentUser}
          onToggleMobile={() => setShowMobile((v) => !v)}
        />
        <main className="flex-1">{body}</main>
      </div>

      {showMobile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center"
          onClick={() => setShowMobile(false)}
        >
          <div className="bg-white rounded-2xl p-8 max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Driver Mobile View</h3>
            <p className="text-sm text-slate-500">Coming in the next migration step.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
