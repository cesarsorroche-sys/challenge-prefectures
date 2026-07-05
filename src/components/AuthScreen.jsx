import { useState } from "react";

import "./AuthScreen.css";

export default function AuthScreen({ onSendMagicLink, error, onBrowse }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setLocalError("");
    try {
      await onSendMagicLink(email, name);
      setSent(true);
    } catch (sendError) {
      setLocalError(sendError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-mark">📷</div>
        <p className="auth-kicker">Challenge collaboratif</p>
        <h1>Préfectures de France</h1>
        {sent ? (
          <div className="auth-success">
            <strong>Consultez votre boîte mail</strong>
            <p>Un lien de connexion vient d’être envoyé à <b>{email}</b>.</p>
            <button type="button" onClick={() => setSent(false)}>Utiliser une autre adresse</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>
              Votre prénom
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Camille" required />
            </label>
            <label>
              Votre adresse e-mail
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@exemple.fr" required />
            </label>
            {(localError || error) && <p className="auth-error">{localError || error}</p>}
            <button className="auth-submit" disabled={loading}>
              {loading ? "Envoi…" : "Recevoir mon lien de connexion"}
            </button>
          </form>
        )}
        <small>Les cinq premiers comptes créés deviennent les cinq membres du challenge.</small>
        <button className="auth-browse" type="button" onClick={onBrowse}>Continuer en lecture seule</button>
      </section>
    </main>
  );
}
