import { useState } from "react";

import "./AuthScreen.css";

function getFriendlyError(error) {
  const message = error?.message || String(error || "");
  if (/invalid login credentials/i.test(message)) return "Adresse e-mail ou mot de passe incorrect.";
  if (/user already registered|already registered/i.test(message)) return "Un compte existe déjà avec cette adresse. Utilise plutôt « Se connecter ».";
  if (/password/i.test(message) && /weak|short|length/i.test(message)) return "Choisis un mot de passe plus long.";
  return message || "Une erreur est survenue. Réessaie dans un instant.";
}

export default function AuthScreen({ onLogin, onCreateAccount, error, onBrowse }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setLocalError("");
    setNotice("");

    try {
      const cleanEmail = email.trim();
      if (isSignup && password.length < 8) {
        throw new Error("Choisis un mot de passe d’au moins 8 caractères.");
      }

      if (isSignup) {
        const result = await onCreateAccount(cleanEmail, password, name);
        if (result?.needsConfirmation) {
          setNotice("Compte créé. Si Supabase demande encore une confirmation d’e-mail, désactive cette option dans Authentication > Providers > Email.");
        }
      } else {
        await onLogin(cleanEmail, password);
      }
    } catch (submitError) {
      setLocalError(getFriendlyError(submitError));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setLocalError("");
    setNotice("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-mark">📷</div>
        <p className="auth-kicker">Challenge collaboratif</p>
        <h1>Préfectures de France</h1>

        <div className="auth-tabs" role="tablist" aria-label="Mode de connexion">
          <button type="button" className={!isSignup ? "active" : ""} onClick={() => switchMode("login")}>
            Se connecter
          </button>
          <button type="button" className={isSignup ? "active" : ""} onClick={() => switchMode("signup")}>
            Créer un accès
          </button>
        </div>

        <form onSubmit={submit}>
          {isSignup && (
            <label>
              Votre prénom
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Camille" required />
            </label>
          )}
          <label>
            Adresse e-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isSignup ? "8 caractères minimum" : "Votre mot de passe"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </label>

          {(localError || error) && <p className="auth-error">{localError || error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <button className="auth-submit" disabled={loading}>
            {loading ? "Connexion…" : isSignup ? "Créer mon accès" : "Se connecter"}
          </button>
        </form>

        <small>
          Les cinq premiers comptes créés deviennent les membres du challenge. Les autres visiteurs peuvent
          continuer en lecture seule.
        </small>
        <button className="auth-browse" type="button" onClick={onBrowse}>Continuer en lecture seule</button>
      </section>
    </main>
  );
}
