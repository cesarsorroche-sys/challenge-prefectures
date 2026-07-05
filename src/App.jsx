import { useState } from "react";

import "./App.css";
import AuthScreen from "./components/AuthScreen";
import DepartmentPanel from "./components/DepartmentPanel";
import FranceMap from "./components/FranceMap";
import Sidebar from "./components/Sidebar";
import useDepartments from "./hooks/useDepartments";

const DEFAULT_DEPARTMENT = { code: "63", nom: "Puy-de-Dôme" };

export default function App() {
  const [selectedDepartment, setSelectedDepartment] = useState(DEFAULT_DEPARTMENT);
  const [showCorsica, setShowCorsica] = useState(true);
  const challenge = useDepartments();

  if (challenge.authLoading) {
    return <main className="app-loading"><span /><p>Connexion au challenge…</p></main>;
  }

  if (challenge.isConfigured && !challenge.session) {
    return <AuthScreen onSendMagicLink={challenge.sendMagicLink} error={challenge.error} />;
  }

  const currentSlot = challenge.currentUser?.slot;
  const teammate = challenge.profiles.find((profile) => profile.slot !== currentSlot);
  const currentData = selectedDepartment ? challenge.getDepartment(selectedDepartment.code, currentSlot) : null;
  const teammateData = selectedDepartment && teammate
    ? challenge.getDepartment(selectedDepartment.code, teammate.slot)
    : null;

  return (
    <main className="app-shell">
      <Sidebar
        entries={challenge.entries}
        profiles={challenge.profiles}
        currentUser={challenge.currentUser}
        userCounts={challenge.userCounts}
        visitedCount={challenge.visitedCount}
        totalCount={96}
        progress={challenge.progress}
        showCorsica={showCorsica}
        onToggleCorsica={() => setShowCorsica((value) => !value)}
        onSelect={setSelectedDepartment}
        onSwitchUser={challenge.setActiveSlot}
        onLogout={challenge.logout}
        isLocalMode={challenge.isLocalMode}
        syncing={challenge.syncing}
      />

      <FranceMap
        onSelect={setSelectedDepartment}
        selectedCode={selectedDepartment?.code}
        entries={challenge.entries}
        showCorsica={showCorsica}
      />

      <DepartmentPanel
        key={`${selectedDepartment?.code || "empty"}-${currentSlot}`}
        department={selectedDepartment}
        data={currentData}
        teammateData={teammateData}
        currentUser={challenge.currentUser}
        teammate={teammate}
        onClose={() => setSelectedDepartment(null)}
        toggleVisited={challenge.toggleVisited}
        setPhoto={challenge.setPhoto}
        removePhoto={challenge.removePhoto}
        setComment={challenge.setComment}
        syncing={challenge.syncing}
      />

      {challenge.error && <div className="sync-error" role="alert">{challenge.error}</div>}
    </main>
  );
}
