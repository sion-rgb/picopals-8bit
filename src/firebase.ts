import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { CloudSaveEnvelope, SyncLog, SyncState } from "./types";
import type { CloudBackend } from "./sync";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};
export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
let app: FirebaseApp | undefined,
  auth: Auth | undefined,
  firestore: Firestore | undefined;
export function getFirebase() {
  if (!firebaseConfigured) return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    void setPersistence(auth, browserLocalPersistence);
    void getRedirectResult(auth).catch(() => undefined);
  }
  return { app, auth: auth!, firestore: firestore! };
}
export const observeUser = (callback: (user: User | null) => void) => {
  const service = getFirebase();
  if (!service) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(service.auth, callback);
};
export async function loginWithGoogle() {
  const service = getFirebase();
  if (!service) throw new Error("雲端服務尚未設定。");
  const provider = new GoogleAuthProvider();
  try {
    return (await signInWithPopup(service.auth, provider)).user;
  } catch (error) {
    if (matchMedia("(max-width: 720px)").matches) {
      await signInWithRedirect(service.auth, provider);
      return null;
    }
    throw error;
  }
}
export async function loginWithEmail(
  email: string,
  password: string,
  create = false,
) {
  const service = getFirebase();
  if (!service) throw new Error("雲端服務尚未設定。");
  return (
    create
      ? await createUserWithEmailAndPassword(service.auth, email, password)
      : await signInWithEmailAndPassword(service.auth, email, password)
  ).user;
}
export async function logoutFirebase() {
  const service = getFirebase();
  if (service) await signOut(service.auth);
}

const cleanEnvelope = (data: CloudSaveEnvelope) => ({
  ...data,
  serverUpdatedAt: serverTimestamp(),
});
export class FirestoreBackend implements CloudBackend {
  readonly userId: string;
  constructor(
    private store: Firestore,
    private user: User,
  ) {
    this.userId = user.uid;
  }
  private saveRef() {
    return doc(this.store, "users", this.userId, "gameSaves", "main");
  }
  async getSave() {
    const snap = await getDoc(this.saveRef());
    return snap.exists() ? (snap.data() as CloudSaveEnvelope) : null;
  }
  async createSave(envelope: CloudSaveEnvelope) {
    const ref = this.saveRef();
    return runTransaction(this.store, async (tx) => {
      const current = await tx.get(ref);
      if (current.exists()) throw new Error("雲端已經有存檔，請重新檢查。");
      tx.set(ref, cleanEnvelope(envelope));
      tx.set(
        doc(this.store, "users", this.userId),
        { ownerUid: this.userId, lastSeenAt: serverTimestamp() },
        { merge: true },
      );
      return envelope;
    });
  }
  async compareAndSet(expectedRevision: number, envelope: CloudSaveEnvelope) {
    const ref = this.saveRef();
    return runTransaction(this.store, async (tx) => {
      const current = await tx.get(ref);
      if (!current.exists() || current.data().revision !== expectedRevision)
        return "conflict" as const;
      tx.set(ref, cleanEnvelope(envelope));
      return envelope;
    });
  }
  async deleteSave() {
    await deleteDoc(this.saveRef());
  }
  async addSnapshot(envelope: CloudSaveEnvelope, reason: string) {
    const ref = doc(
      collection(this.store, "users", this.userId, "cloudSnapshots"),
    );
    await setDoc(ref, {
      ...cleanEnvelope(envelope),
      reason,
      createdAt: serverTimestamp(),
    });
    const rows = await getDocs(
      query(
        collection(this.store, "users", this.userId, "cloudSnapshots"),
        orderBy("createdAt", "desc"),
        limit(20),
      ),
    );
    if (rows.size > 10) {
      const batch = writeBatch(this.store);
      rows.docs.slice(10).forEach((x) => batch.delete(x.ref));
      await batch.commit();
    }
  }
  async addLog(log: SyncLog) {
    const ref = doc(collection(this.store, "users", this.userId, "syncLogs"));
    await setDoc(ref, {
      ownerUid: this.userId,
      ...log,
      createdAt: serverTimestamp(),
    });
    const rows = await getDocs(
      query(
        collection(this.store, "users", this.userId, "syncLogs"),
        orderBy("createdAt", "desc"),
        limit(75),
      ),
    );
    if (rows.size > 50) {
      const batch = writeBatch(this.store);
      rows.docs.slice(50).forEach((x) => batch.delete(x.ref));
      await batch.commit();
    }
  }
  async touchDevice(state: SyncState) {
    const ref = doc(
      this.store,
      "users",
      this.userId,
      "devices",
      state.deviceId,
    );
    await setDoc(
      ref,
      {
        ownerUid: this.userId,
        deviceId: state.deviceId,
        deviceName: state.deviceName,
        firstSeenAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        appVersion: "3.0.0",
        platform: navigator.platform?.slice(0, 40) || "browser",
        lastSyncedRevision: state.lastSyncedRevision,
      },
      { merge: true },
    );
  }
}
export const backendForUser = (user: User | null) => {
  const service = getFirebase();
  return user && service ? new FirestoreBackend(service.firestore, user) : null;
};
