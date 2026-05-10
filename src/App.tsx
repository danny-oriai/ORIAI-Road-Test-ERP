import { useState } from "react";
import type { PageKey, User } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { PAGE_TITLES, SIDEBAR_ACTIVE_KEY } from "./components/layout/navConfig";
import { USERS } from "./mock/users";

// Batch 1
import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { ProjectDetailPage } from "./pages/ProjectDetail";

// Batch 2
import { VehiclesPage } from "./pages/Vehicles";
import { VehicleDetailPage } from "./pages/VehicleDetail";
import { VehicleCheckFormPage } from "./pages/VehicleCheckForm";
import { PlatesPage } from "./pages/Plates";
import { PlateTimelinePage } from "./pages/PlateTimeline";
import { RoutesPage } from "./pages/Routes";
import { PoisPage } from "./pages/POIs";

// Batch 3
import { TasksPage } from "./pages/Tasks";
import { StaffPage } from "./pages/Staff";
import { AttendancePage } from "./pages/Attendance";
import { IssuesPage } from "./pages/Issues";
import { ExpensesPage } from "./pages/Expenses";
import { FilesPage } from "./pages/Files";
import { UsersPage } from "./pages/Users";
import { SettingsPage } from "./pages/Settings";
import { MobileDriverView } from "./pages/MobileDriverView";

function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [currentUserId, setCurrentUserId] = useState<string>("U001"); // Sarah Mitchell, PMO
  const [showMobile, setShowMobile] = useState(false);

  // Drill-through selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const currentUser: User = USERS.find((u) => u.id === currentUserId)!;
  const sidebarActive = SIDEBAR_ACTIVE_KEY[page];

  const openProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPage("project-detail");
  };

  const openVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setPage("vehicle-detail");
  };

  // For the mobile preview, default to whichever Driver is most likely to have a task today;
  // fall back to the current user if they happen to be a driver, otherwise pick a fixed driver
  // so the screen renders with content even when impersonating a PMO/Admin.
  const previewDriverId =
    currentUser.role === "Driver"
      ? currentUser.id
      : USERS.find((u) => u.role === "Driver")?.id ?? "U001";

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
        <ProjectDetailPage projectId={selectedProjectId} onBack={() => setPage("projects")} />
      ) : (
        <ProjectsPage onOpen={openProject} />
      );
      break;
    case "vehicles":
      body = <VehiclesPage onOpen={openVehicle} />;
      break;
    case "vehicle-detail":
      body = selectedVehicleId ? (
        <VehicleDetailPage
          vehicleId={selectedVehicleId}
          onBack={() => setPage("vehicles")}
          onNav={setPage}
          onOpenProject={openProject}
        />
      ) : (
        <VehiclesPage onOpen={openVehicle} />
      );
      break;
    case "vehicle-check":
      body = (
        <VehicleCheckFormPage
          vehicleId={selectedVehicleId ?? undefined}
          onBack={() => setPage(selectedVehicleId ? "vehicle-detail" : "vehicles")}
        />
      );
      break;
    case "plates":
      body = <PlatesPage onNav={setPage} />;
      break;
    case "plate-timeline":
      body = <PlateTimelinePage />;
      break;
    case "routes":
      body = <RoutesPage />;
      break;
    case "pois":
      body = <PoisPage />;
      break;

    // Batch 3
    case "tasks":
      body = <TasksPage onOpenProject={openProject} onNav={setPage} />;
      break;
    case "staff":
      body = <StaffPage />;
      break;
    case "attendance":
      body = <AttendancePage />;
      break;
    case "issues":
      body = <IssuesPage />;
      break;
    case "expenses":
      body = <ExpensesPage />;
      break;
    case "files":
      body = <FilesPage />;
      break;
    case "users":
      body = <UsersPage />;
      break;
    case "settings":
      body = <SettingsPage />;
      break;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        active={sidebarActive}
        onNav={setPage}
        currentUser={currentUser}
        onSwitchUser={setCurrentUserId}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          pageTitle={PAGE_TITLES[page]}
          currentUser={currentUser}
          onToggleMobile={() => setShowMobile((v) => !v)}
        />
        <main className="flex-1">{body}</main>
      </div>

      {showMobile && (
        <MobileDriverView
          onClose={() => setShowMobile(false)}
          driverUserId={previewDriverId}
        />
      )}
    </div>
  );
}

export default App;
