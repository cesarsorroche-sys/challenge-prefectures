import { useState } from "react";

import "./DepartmentPanel.css";
import prefectures from "../data/prefectures";

function formatDate(date) {
  if (!date) return "aujourd’hui";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export default function DepartmentPanel({
  department,
  data,
  participantData,
  currentUser,
  isReadOnly,
  onClose,
  toggleVisited,
  setPhoto,
  removePhoto,
  setComment,
  syncing,
}) {
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  if (!department) {
    return (
      <aside className="department-panel empty-panel">
        <div className="empty-map-pin">⌖</div>
        <h2>Sélectionnez un département</h2>
        <p>Cliquez sur la carte ou utilisez la recherche.</p>
      </aside>
    );
  }

  const info = prefectures[department.code] || {};
  const contributions = participantData.filter(({ data: memberData }) => memberData?.photo || memberData?.comment);

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (file) setPhoto(department.code, file);
    event.target.value = "";
  }

  return (
    <aside className="department-panel">
      <header className="department-header">
        <div>
          <h2>{department.nom || info.department} <span>({department.code})</span></h2>
          <p>Préfecture : <strong>{info.prefecture}</strong></p>
        </div>
        <button type="button" className="close-panel" aria-label="Fermer" onClick={onClose}>×</button>
      </header>

      <section className="member-statuses" aria-label="Visites des membres">
        {participantData.map(({ profile, data: memberData }) => (
          <div key={profile.id} className={`member-status slot-${profile.slot}${memberData?.visited ? " visited" : ""}`}>
            <i /> <span>{profile.display_name}</span><b>{memberData?.visited ? "✓ Visité" : "À visiter"}</b>
          </div>
        ))}
      </section>

      {isReadOnly ? (
        <>
          <p className="contribution-title">Contributions de l’équipe</p>
          {contributions.length ? contributions.map(({ profile, data: memberData }) => (
            <section className={`teammate-contribution slot-${profile.slot}`} key={profile.id}>
              <div>
                <strong>{profile.display_name}</strong>
                {memberData.photo && <button type="button" onClick={() => setFullscreenPhoto(memberData.photo)}>Voir la photo</button>}
              </div>
              {memberData.comment && <p>{memberData.comment}</p>}
            </section>
          )) : <p className="no-contribution">Aucune contribution pour ce département.</p>}
          <p className="readonly-notice">Mode lecture seule</p>
        </>
      ) : (
        <>
          <p className="contribution-title">Ma contribution</p>
          {data?.photo ? (
            <>
              <button className="photo-preview" type="button" onClick={() => setFullscreenPhoto(data.photo)}>
                <img src={data.photo} alt={`Préfecture de ${info.prefecture}`} />
              </button>
              <div className="photo-meta">
                <span>Photo ajoutée le {formatDate(data.photoDate || data.visitDate)}</span>
                <button type="button" onClick={() => removePhoto(department.code)}>⌫ <span>Supprimer</span></button>
              </div>
              <button className="fullscreen-button" type="button" onClick={() => setFullscreenPhoto(data.photo)}>↗ Voir en plein écran</button>
            </>
          ) : (
            <label className="upload-zone">
              <span className="upload-camera">▣</span><strong>Ajouter ma photo</strong><small>JPG, PNG ou WEBP</small>
              <input hidden type="file" accept="image/*" onChange={handlePhoto} disabled={syncing} />
            </label>
          )}

          <section className="notes-card">
            <div className="notes-heading"><strong>Mes notes personnelles</strong><span aria-hidden="true">✎</span></div>
            <textarea value={data?.comment || ""} placeholder="Ajoutez vos souvenirs, vos impressions…" onChange={(event) => setComment(department.code, event.target.value)} />
          </section>

          {data?.photo && (
            <label className="change-photo-button">▧ Changer ma photo<input hidden type="file" accept="image/*" onChange={handlePhoto} disabled={syncing} /></label>
          )}

          <button className={`visited-button${data?.visited ? " is-visited" : ""}`} type="button" disabled={syncing} onClick={() => toggleVisited(department.code)}>
            {data?.visited ? "✓ J’ai visité ce département" : "Marquer comme visité"}
          </button>

          {contributions.filter(({ profile }) => profile.id !== currentUser?.id).map(({ profile, data: memberData }) => (
            <section className={`teammate-contribution slot-${profile.slot}`} key={profile.id}>
              <div>
                <strong>Contribution de {profile.display_name}</strong>
                {memberData.photo && <button type="button" onClick={() => setFullscreenPhoto(memberData.photo)}>Voir la photo</button>}
              </div>
              {memberData.comment && <p>{memberData.comment}</p>}
            </section>
          ))}
        </>
      )}

      {fullscreenPhoto && (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo en plein écran">
          <button type="button" aria-label="Fermer" onClick={() => setFullscreenPhoto(null)}>×</button>
          <img src={fullscreenPhoto} alt={`Préfecture de ${info.prefecture}`} />
        </div>
      )}
    </aside>
  );
}
