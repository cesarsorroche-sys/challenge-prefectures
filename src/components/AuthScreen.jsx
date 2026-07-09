import { useState } from "react";

import "./AuthScreen.css";

function getFriendlyError(error) {
  const message = error?.message || String(error || "");
  if (/invalid login credentials/i.test(message)) return "Adresse e-mail ou mot de passe incorrect.";
  if (/user already registered|already registered/i.test(message)) return "Un compte existe déjà avec cette adresse. Utilise plutôt « Se connecter ».";
  if (/password/i.test(message) && /weak|short|length/i.test(message)) return "Choisis un mot de passe plus long.";
  return message || "Une erreur est survenue. Réessaie dans un instant.";
}

export default function AuthScreen({
  onLogin,
  onCreateAccount,
  onRequestPasswordReset,
  onUpdatePassword,
  isPasswordRecovery = false,
  error,
  onBrowse,
}) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");

  const activeMode = isPasswordRecovery ? "update-password" : mode;
  const isSignup = activeMode === "signup";
  const isResetRequest = activeMode === "reset-request";
  const isPasswordUpdate = activeMode === "update-password";

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setLocalError("");
    setNotice("");

    try {
      const cleanEmail = email.trim();

      if (isResetRequest) {
        await onRequestPasswordReset(cleanEmail);
        setNotice("Si cette adresse correspond à un membre du challenge, un e-mail de réinitialisation vient d’être envoyé.");
        return;
      }

      if (isPasswordUpdate) {
        if (password.length < 8) throw new Error("Choisis un mot de passe d’au moins 8 caractères.");
        if (password !== passwordConfirmation) throw new Error("Les deux mots de passe ne correspondent pas.");
        await onUpdatePassword(password);
        return;
      }

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
    setPassword("");
    setPasswordConfirmation("");
  }

  function getSubmitLabel() {
    if (loading) {
      if (isResetRequest) return "Envoi…";
      if (isPasswordUpdate) return "Enregistrement…";
      return "Connexion…";
    }
    if (isResetRequest) return "Envoyer le lien de réinitialisation";
    if (isPasswordUpdate) return "Enregistrer le nouveau mot de passe";
    if (isSignup) return "Créer mon accès";
    return "Se connecter";
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-mark">📷</div>
        <p className="auth-kicker">Challenge collaboratif</p>
        <h1>{isPasswordUpdate ? "Nouveau mot de passe" : "Préfectures de France"}</h1>

        {!isPasswordUpdate && (
          <div className="auth-tabs" role="tablist" aria-label="Mode de connexion">
            <button type="button" className={activeMode === "login" ? "active" : ""} onClick={() => switchMode("login")}>
              Se connecter
            </button>
            <button type="button" className={isSignup ? "active" : ""} onClick={() => switchMode("signup")}>
              Créer un accès
            </button>
          </div>
        )}

        {isResetRequest && (
          <p className="auth-intro">
            Indique ton adresse e-mail : Supabase t’enverra un lien sécurisé pour choisir un nouveau mot de passe.
          </p>
        )}

        {isPasswordUpdate && (
          <p className="auth-intro">
            Choisis ton nouveau mot de passe. Une fois enregistré, tu seras reconnecté au challenge.
          </p>
        )}

        <form onSubmit={submit}>
          {isSignup && (
            <label>
              Votre prénom
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Camille" required />
            </label>
          )}

          {!isPasswordUpdate && (
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
          )}

          {!isResetRequest && (
            <label>
              {isPasswordUpdate ? "Nouveau mot de passe" : "Mot de passe"}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup || isPasswordUpdate ? "8 caractères minimum" : "Votre mot de passe"}
                autoComplete={isPasswordUpdate || isSignup ? "new-password" : "current-password"}
                required
              />
            </label>
          )}

          {isPasswordUpdate && (
            <label>
              Confirmer le mot de passe
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                placeholder="Répétez le nouveau mot de passe"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {(localError || error) && <p className="auth-error">{localError || error}</p>}
          {notice && <p className="auth-notice">{notice}</p>}

          <button className="auth-submit" disabled={loading}>
            {getSubmitLabel()}
          </button>
        </form>

        {activeMode === "login" && (
          <button className="auth-link" type="button" onClick={() => switchMode("reset-request")}>
            Mot de passe oublié ?
          </button>
        )}

        {isResetRequest && (
          <button className="auth-link" type="button" onClick={() => switchMode("login")}>
            Retour à la connexion
          </button>
        )}

        {!isPasswordUpdate && (
          <>
            <small>
              Les cinq premiers comptes créés deviennent les membres du challenge. Les autres visiteurs peuvent
              continuer en lecture seule.
            </small>
            <button className="auth-browse" type="button" onClick={onBrowse}>Continuer en lecture seule</button>
          </>
        )}
      </section>
    </main>
  );
}
