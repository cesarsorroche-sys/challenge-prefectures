import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bootstrapSession,
  database,
  isSupabaseConfigured,
  sendMagicLink,
  signOut as apiSignOut,
  storage,
} from "../lib/supabaseApi";

const STORAGE_KEY = "challenge-prefectures-collab";
const LEGACY_KEY = "challenge-prefectures";
const TOTAL_DEPARTMENTS = 96;
const LOCAL_USERS = [
  { id: "local-user-1", slot: 1, display_name: "Moi" },
  { id: "local-user-2", slot: 2, display_name: "Partenaire" },
  { id: "local-user-3", slot: 3, display_name: "Membre 3" },
  { id: "local-user-4", slot: 4, display_name: "Membre 4" },
  { id: "local-user-5", slot: 5, display_name: "Membre 5" },
];

const emptyEntry = () => ({ visited: false, photo: null, photoPath: "", photoDate: "", comment: "", visitDate: "" });

function readLocalEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) return saved;
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}") || {};
    return Object.fromEntries(
      Object.entries(legacy).map(([code, entry]) => [code, {
        1: entry,
        2: emptyEntry(),
        3: emptyEntry(),
        4: emptyEntry(),
        5: emptyEntry(),
      }]),
    );
  } catch {
    return {};
  }
}

function rowsToEntries(rows, profiles) {
  const slotsById = Object.fromEntries(profiles.map((profile) => [profile.id, profile.slot]));
  return rows.reduce((result, row) => {
    const slot = slotsById[row.user_id];
    if (!slot) return result;
    result[row.department_code] ||= {};
    result[row.department_code][slot] = {
      visited: row.visited,
      photo: row.photo_url,
      photoPath: row.photo_path || "",
      photoDate: row.photo_date || "",
      comment: row.comment || "",
      visitDate: row.visit_date || "",
    };
    return result;
  }, {});
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function useDepartments() {
  const [entries, setEntries] = useState(readLocalEntries);
  const [profiles, setProfiles] = useState(LOCAL_USERS);
  const [activeSlot, setActiveSlotState] = useState(() => Number(localStorage.getItem("challenge-active-slot")) || 1);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const commentTimers = useRef(new Map());

  const loadRemoteData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setSyncing(true);
    try {
      const remoteProfiles = await database.profiles();
      const remoteEntries = await database.entries();
      setProfiles(remoteProfiles);
      setEntries(rowsToEntries(remoteEntries, remoteProfiles));
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    bootstrapSession()
      .then((nextSession) => setSession(nextSession))
      .catch((authError) => setError(authError.message))
      .finally(() => setAuthLoading(false));
    return undefined;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return undefined;
    const initialLoad = window.setTimeout(loadRemoteData, 0);
    const interval = window.setInterval(loadRemoteData, 4000);
    const refresh = () => document.visibilityState === "visible" && loadRemoteData();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [authLoading, loadRemoteData]);

  useEffect(() => () => {
    commentTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const currentUser = useMemo(() => {
    if (!isSupabaseConfigured) return profiles.find((profile) => profile.slot === activeSlot) || profiles[0];
    return profiles.find((profile) => profile.id === session?.user?.id) || null;
  }, [profiles, activeSlot, session]);

  function saveLocal(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function setActiveSlot(slot) {
    if (isSupabaseConfigured) return;
    setActiveSlotState(slot);
    localStorage.setItem("challenge-active-slot", String(slot));
  }

  function updateEntry(code, slot, updater) {
    setEntries((previous) => {
      const current = previous[code]?.[slot] || emptyEntry();
      const next = { ...previous, [code]: { ...previous[code], [slot]: updater(current) } };
      if (!isSupabaseConfigured) saveLocal(next);
      return next;
    });
  }

  async function persistEntry(code, entry) {
    if (!isSupabaseConfigured || !currentUser) return;
    await database.upsertEntry({
      user_id: currentUser.id,
      department_code: code,
      visited: entry.visited,
      photo_url: entry.photo || null,
      photo_path: entry.photoPath || null,
      photo_date: entry.photoDate || null,
      comment: entry.comment || "",
      visit_date: entry.visitDate || null,
      updated_at: new Date().toISOString(),
    });
  }

  function getDepartment(code, slot = currentUser?.slot) {
    return entries[code]?.[slot] || emptyEntry();
  }

  async function toggleVisited(code) {
    if (!currentUser) return;
    const current = getDepartment(code);
    const next = {
      ...current,
      visited: !current.visited,
      visitDate: !current.visited ? current.visitDate || new Date().toISOString().slice(0, 10) : "",
    };
    updateEntry(code, currentUser.slot, () => next);
    persistEntry(code, next).catch((persistError) => setError(persistError.message));
  }

  async function setPhoto(code, file) {
    if (!currentUser || !file) return;
    setSyncing(true);
    try {
      const extension = file.name?.split(".").pop()?.toLowerCase() || "jpg";
      const photoPath = isSupabaseConfigured
        ? `${currentUser.id}/${code}-${Date.now()}.${extension}`
        : "";
      const photo = isSupabaseConfigured ? await storage.upload(photoPath, file) : await fileToDataUrl(file);
      const current = getDepartment(code);
      const next = {
        ...current,
        photo,
        photoPath,
        photoDate: new Date().toISOString().slice(0, 10),
        visited: true,
        visitDate: current.visitDate || new Date().toISOString().slice(0, 10),
      };
      updateEntry(code, currentUser.slot, () => next);
      await persistEntry(code, next);
    } catch (photoError) {
      setError(photoError.message);
    } finally {
      setSyncing(false);
    }
  }

  async function removePhoto(code) {
    if (!currentUser) return;
    const current = getDepartment(code);
    if (isSupabaseConfigured && current.photoPath) await storage.remove(current.photoPath).catch(() => null);
    const next = { ...current, photo: null, photoPath: "", photoDate: "" };
    updateEntry(code, currentUser.slot, () => next);
    persistEntry(code, next).catch((persistError) => setError(persistError.message));
  }

  function setComment(code, comment) {
    if (!currentUser) return;
    const next = { ...getDepartment(code), comment };
    updateEntry(code, currentUser.slot, () => next);
    if (!isSupabaseConfigured) return;
    window.clearTimeout(commentTimers.current.get(code));
    commentTimers.current.set(code, window.setTimeout(() => {
      persistEntry(code, next).catch((persistError) => setError(persistError.message));
    }, 600));
  }

  const visitedCount = useMemo(
    () => Object.values(entries).filter((department) => Object.values(department).some((entry) => entry?.visited)).length,
    [entries],
  );
  const progress = Number(((visitedCount / TOTAL_DEPARTMENTS) * 100).toFixed(1));

  const userCounts = useMemo(() => Object.fromEntries(
    profiles.map((profile) => [profile.slot, Object.values(entries).filter((entry) => entry[profile.slot]?.visited).length]),
  ), [entries, profiles]);

  async function logout() {
    await apiSignOut();
    setSession(null);
    await loadRemoteData();
  }

  return {
    entries,
    profiles,
    currentUser,
    userCounts,
    visitedCount,
    progress,
    getDepartment,
    toggleVisited,
    setPhoto,
    removePhoto,
    setComment,
    setActiveSlot,
    isLocalMode: !isSupabaseConfigured,
    isReadOnly: isSupabaseConfigured && !session,
    isConfigured: isSupabaseConfigured,
    session,
    authLoading,
    syncing,
    error,
    sendMagicLink,
    logout,
  };
}
