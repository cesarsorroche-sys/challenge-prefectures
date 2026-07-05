import "./Sidebar.css";
import prefectures from "../data/prefectures";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 5.5 10 3.8h4l1.5 1.7H19a2 2 0 0 1 2 2v10.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.5Z" />
      <circle cx="12" cy="12.4" r="4" />
    </svg>
  );
}

function initials(name = "?") {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function Sidebar({
  entries,
  profiles,
  currentUser,
  userCounts,
  visitedCount,
  totalCount,
  progress,
  showCorsica,
  onToggleCorsica,
  onSelect,
  onSwitchUser,
  onLogout,
  isLocalMode,
  syncing,
}) {
  const photos = Object.entries(entries).flatMap(([code, department]) =>
    profiles.flatMap((profile) => {
      const entry = department[profile.slot];
      return entry?.photo ? [{ code, entry, profile }] : [];
    }),
  );
  const circumference = 2 * Math.PI * 63;
  const dashOffset = circumference * (1 - progress / 100);
  const firstUser = profiles.find((profile) => profile.slot === 1);
  const secondUser = profiles.find((profile) => profile.slot === 2);

  return (
    <aside className="sidebar">
      <header className="brand">
        <div className="brand-line"><span>Challenge</span><CameraIcon /></div>
        <h1>Préfectures de France</h1>
      </header>

      <section className="sidebar-card team-card">
        <div className="team-heading">
          <h2>Notre équipe</h2>
          <span className={syncing ? "sync-dot syncing" : "sync-dot"} title={syncing ? "Synchronisation…" : "Synchronisé"} />
        </div>
        <div className="team-members">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              disabled={!isLocalMode}
              className={`team-member slot-${profile.slot}${currentUser?.id === profile.id ? " active" : ""}`}
              onClick={() => onSwitchUser(profile.slot)}
            >
              <i>{initials(profile.display_name)}</i>
              <span><strong>{profile.display_name}</strong><small>{userCounts[profile.slot] || 0} visités</small></span>
              {currentUser?.id === profile.id && <b>Moi</b>}
            </button>
          ))}
        </div>
        {isLocalMode ? (
          <p className="demo-notice">Mode démonstration : cliquez sur un profil pour changer d’utilisateur.</p>
        ) : (
          <button className="logout-button" type="button" onClick={onLogout}>Se déconnecter</button>
        )}
      </section>

      <section className="sidebar-card progress-card" aria-label="Progression commune">
        <div className="progress-ring">
          <svg viewBox="0 0 150 150" aria-hidden="true">
            <circle className="progress-track" cx="75" cy="75" r="63" />
            <circle className="progress-value" cx="75" cy="75" r="63" style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }} />
          </svg>
          <div className="progress-copy">
            <span>Départements</span><span>visités ensemble</span>
            <strong>{visitedCount} / {totalCount}</strong>
            <small>{String(progress).replace(".", ",")} %</small>
          </div>
        </div>
      </section>

      <section className="sidebar-card legend-card">
        <h2>Légende</h2>
        <div className="legend-row"><i className="legend-swatch user-one" />{firstUser?.display_name || "Utilisateur 1"}</div>
        <div className="legend-row"><i className="legend-swatch user-two" />{secondUser?.display_name || "Utilisateur 2"}</div>
        <div className="legend-row"><i className="legend-swatch shared" />Visité par les deux</div>
        <div className="legend-row"><i className="legend-swatch todo" />À visiter</div>
      </section>

      <section className="sidebar-card filters-card">
        <h2>Filtres</h2>
        <label className="switch-row">
          <span>Afficher la Corse</span>
          <input type="checkbox" checked={showCorsica} onChange={onToggleCorsica} />
          <i aria-hidden="true" />
        </label>
      </section>

      <section className="sidebar-card photos-card">
        <div className="photos-heading"><h2>Nos photos</h2><span>{photos.length}</span></div>
        <div className="photos-grid">
          {[0, 1, 2].map((index) => {
            const photo = photos[index];
            if (!photo) return <div className="photo-empty" key={index} />;
            return (
              <button className={`photo-thumb slot-${photo.profile.slot}`} key={`${photo.code}-${photo.profile.id}`} title={`${prefectures[photo.code]?.department} · ${photo.profile.display_name}`} onClick={() => onSelect({ code: photo.code, nom: prefectures[photo.code]?.department || photo.code })}>
                <img src={photo.entry.photo} alt={prefectures[photo.code]?.department || "Préfecture"} />
                <i>{initials(photo.profile.display_name)}</i>
              </button>
            );
          })}
        </div>
        <button className="photos-button" type="button">Voir toutes nos photos</button>
      </section>
    </aside>
  );
}
