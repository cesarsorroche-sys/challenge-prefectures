import { useEffect, useState } from "react";

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

function formatDate(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
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
  onLogin,
  isLocalMode,
  isReadOnly,
  syncing,
}) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const photos = Object.entries(entries).flatMap(([code, department]) =>
    profiles.flatMap((profile) => {
      const entry = department[profile.slot];
      if (!entry?.photo) return [];
      const info = prefectures[code] || {};
      return [{
        code,
        entry,
        profile,
        departmentName: info.department || code,
        prefecture: info.prefecture || "",
        date: entry.photoDate || entry.visitDate || "",
      }];
    }),
  ).sort((left, right) => (right.date || "").localeCompare(left.date || ""));
  const circumference = 2 * Math.PI * 63;
  const dashOffset = circumference * (1 - progress / 100);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== "Escape") return;
      setSelectedPhoto(null);
      setGalleryOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  function openPhoto(photo) {
    setSelectedPhoto(photo);
  }

  function selectDepartment(photo) {
    onSelect({ code: photo.code, nom: photo.departmentName });
    setGalleryOpen(false);
    setSelectedPhoto(null);
  }

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
        ) : isReadOnly ? (
          <button className="login-button" type="button" onClick={onLogin}>Se connecter pour contribuer</button>
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
            <span>Départements</span><span>visités par l’équipe</span>
            <strong>{visitedCount} / {totalCount}</strong>
            <small>{String(progress).replace(".", ",")} %</small>
          </div>
        </div>
      </section>

      <section className="sidebar-card legend-card">
        <h2>Légende</h2>
        {profiles.map((profile) => (
          <div className="legend-row" key={profile.id}><i className={`legend-swatch slot-${profile.slot}`} />{profile.display_name}</div>
        ))}
        <div className="legend-row"><i className="legend-swatch shared" />Plusieurs membres</div>
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
              <button
                className={`photo-thumb slot-${photo.profile.slot}`}
                key={`${photo.code}-${photo.profile.id}`}
                type="button"
                title={`${photo.departmentName} · ${photo.profile.display_name}`}
                onClick={() => openPhoto(photo)}
              >
                <img src={photo.entry.photo} alt={`Photo de ${photo.departmentName}`} />
                <i>{initials(photo.profile.display_name)}</i>
              </button>
            );
          })}
        </div>
        <button className="photos-button" type="button" disabled={!photos.length} onClick={() => setGalleryOpen(true)}>Voir toutes nos photos</button>
      </section>

      {galleryOpen && (
        <div className="photo-gallery-backdrop" role="dialog" aria-modal="true" aria-label="Toutes nos photos">
          <section className="photo-gallery-modal">
            <header className="photo-gallery-header">
              <div>
                <p>Galerie du challenge</p>
                <h2>Toutes nos photos</h2>
              </div>
              <button type="button" aria-label="Fermer la galerie" onClick={() => setGalleryOpen(false)}>×</button>
            </header>

            {photos.length ? (
              <div className="photo-gallery-grid">
                {photos.map((photo) => (
                  <article className={`photo-gallery-card slot-${photo.profile.slot}`} key={`${photo.code}-${photo.profile.id}-${photo.entry.photo}`}>
                    <button type="button" className="photo-gallery-image" onClick={() => openPhoto(photo)}>
                      <img src={photo.entry.photo} alt={`Photo de ${photo.departmentName}`} />
                    </button>
                    <div className="photo-gallery-copy">
                      <strong>{photo.departmentName} <span>({photo.code})</span></strong>
                      <p>{photo.prefecture ? `Préfecture : ${photo.prefecture}` : "Préfecture"}</p>
                      <small>
                        <i>{initials(photo.profile.display_name)}</i>
                        {photo.profile.display_name}
                        {photo.date && <span> · {formatDate(photo.date)}</span>}
                      </small>
                    </div>
                    <button type="button" className="photo-gallery-department" onClick={() => selectDepartment(photo)}>
                      Voir le département
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="photo-gallery-empty">Aucune photo pour le moment.</p>
            )}
          </section>
        </div>
      )}

      {selectedPhoto && (
        <div className="sidebar-photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo en grand">
          <button type="button" aria-label="Fermer la photo" onClick={() => setSelectedPhoto(null)}>×</button>
          <figure>
            <img src={selectedPhoto.entry.photo} alt={`Photo de ${selectedPhoto.departmentName}`} />
            <figcaption>
              <strong>{selectedPhoto.departmentName} <span>({selectedPhoto.code})</span></strong>
              <small>
                {selectedPhoto.profile.display_name}
                {selectedPhoto.date && ` · ${formatDate(selectedPhoto.date)}`}
              </small>
            </figcaption>
          </figure>
        </div>
      )}
    </aside>
  );
}
