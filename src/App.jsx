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
  const [showLogin, setShowLogin] = useState(false);
  const challenge = useDepartments();

  if (challenge.authLoading) {
    return <main className="app-loading"><span /><p>Connexion au challenge…</p></main>;
  }

  if (challenge.isConfigured && !challenge.session && showLogin) {
    return <AuthScreen onSendMagicLink={challenge.sendMagicLink} error={challenge.error} onBrowse={() => setShowLogin(false)} />;
  }

  const currentSlot = challenge.currentUser?.slot;
  const currentData = selectedDepartment ? challenge.getDepartment(selectedDepartment.code, currentSlot) : null;
  const participantData = selectedDepartment
    ? challenge.profiles.map((profile) => ({ profile, data: challenge.getDepartment(selectedDepartment.code, profile.slot) }))
    : [];

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
        onLogin={() => setShowLogin(true)}
        isLocalMode={challenge.isLocalMode}
        isReadOnly={challenge.isReadOnly}
        syncing={challenge.syncing}
      />

      <FranceMap
        onSelect={setSelectedDepartment}
        selectedCode={selectedDepartment?.code}
        entries={challenge.entries}
        profiles={challenge.profiles}
        showCorsica={showCorsica}
      />

      <DepartmentPanel
        key={`${selectedDepartment?.code || "empty"}-${currentSlot}`}
        department={selectedDepartment}
        data={currentData}
        participantData={participantData}
        currentUser={challenge.currentUser}
        isReadOnly={challenge.isReadOnly}
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
