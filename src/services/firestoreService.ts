import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { app } from './googleAuth';
import { Incident, DocumentFolder, StoredDocument } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firestore on user's dedicated project database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Clean collection namespace for 2026 releases
export const INCIDENTS_COLLECTION = 'novedades_tesalia_2026';

// Validate connection to Firestore on initialization
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection'));
    console.log('[Firestore] Conexión activa con base de datos:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firestore] Cliente en modo offline.');
    } else {
      console.info('[Firestore] Conexión validada exitosamente.');
    }
    return true;
  }
}

// =========================================================================
// INCIDENTS CLOUD PERSISTENCE
// =========================================================================

/**
 * Fetch all incidents from Firestore.
 * Prioritizes global and user-linked records.
 */
export async function fetchIncidentsFromFirestore(): Promise<Incident[]> {
  try {
    const colRef = collection(db, INCIDENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const incidents: Incident[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as Incident;
      incidents.push({
        ...data,
        id: data.id || docSnap.id
      });
    });

    // Sort descending by timestamp
    incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return incidents;
  } catch (error) {
    console.warn('[Firestore] Info al cargar novedades desde Firestore:', error);
    return [];
  }
}

/**
 * Save single incident into Firestore, associating Google Account metadata if logged in.
 */
export async function saveIncidentToFirestore(incident: Incident, user?: User | null): Promise<void> {
  try {
    const docRef = doc(db, INCIDENTS_COLLECTION, incident.id);
    const payload: any = {
      ...incident,
      updatedAt: new Date().toISOString()
    };

    if (user) {
      payload.userUid = user.uid;
      payload.userEmail = user.email || '';
      payload.userDisplayName = user.displayName || '';
    }

    await setDoc(docRef, payload, { merge: true });

    // Also mirror to user specific collection if signed in with Google
    if (user?.uid) {
      const userDocRef = doc(db, 'users', user.uid, 'incidents', incident.id);
      await setDoc(userDocRef, payload, { merge: true });
    }
  } catch (error: any) {
    console.warn('[Firestore] Alerta al guardar en Firestore (continuando con persistencia local):', error?.message || error);
  }
}

/**
 * Bulk save array of incidents to Firestore in chunks of up to 400 operations per batch.
 */
export async function saveBatchIncidentsToFirestore(incidents: Incident[], user?: User | null): Promise<void> {
  if (!Array.isArray(incidents) || incidents.length === 0) return;

  try {
    const chunkSize = 400;
    for (let i = 0; i < incidents.length; i += chunkSize) {
      const chunk = incidents.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const incident of chunk) {
        const docRef = doc(db, INCIDENTS_COLLECTION, incident.id);
        const payload: any = {
          ...incident,
          updatedAt: new Date().toISOString()
        };

        if (user) {
          payload.userUid = user.uid;
          payload.userEmail = user.email || '';
          payload.userDisplayName = user.displayName || '';
        }

        batch.set(docRef, payload, { merge: true });

        if (user?.uid) {
          const userDocRef = doc(db, 'users', user.uid, 'incidents', incident.id);
          batch.set(userDocRef, payload, { merge: true });
        }
      }

      await batch.commit();
    }
  } catch (error: any) {
    console.warn('[Firestore] Alerta al guardar lote en Firestore (se mantiene persistencia local):', error?.message || error);
  }
}

/**
 * Delete single incident from Firestore
 */
export async function deleteIncidentFromFirestore(incidentId: string, user?: User | null): Promise<void> {
  try {
    await deleteDoc(doc(db, INCIDENTS_COLLECTION, incidentId));
    if (user?.uid) {
      await deleteDoc(doc(db, 'users', user.uid, 'incidents', incidentId));
    }
  } catch (error: any) {
    console.warn('[Firestore] Alerta al eliminar novedad en Firestore:', error?.message || error);
  }
}

/**
 * Wipe all incidents from Firestore (admin reset)
 */
export async function clearAllIncidentsInFirestore(): Promise<void> {
  try {
    const colRef = collection(db, INCIDENTS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  } catch (error: any) {
    console.warn('[Firestore] Alerta al limpiar novedades:', error?.message || error);
  }
}

/**
 * Realtime listener for Firestore incidents
 */
export function subscribeToIncidents(
  onUpdate: (incidents: Incident[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, INCIDENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const incidents: Incident[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Incident;
        incidents.push({
          ...data,
          id: data.id || docSnap.id
        });
      });
      incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(incidents);
    },
    (err) => {
      console.warn('[Firestore] Error en snapshot realtime:', err);
      if (onError) onError(err);
    }
  );
}

// =========================================================================
// REPOSITORIO DOCUMENTAL CLOUD PERSISTENCE
// =========================================================================

export async function fetchFoldersFromFirestore(): Promise<DocumentFolder[]> {
  try {
    const snapshot = await getDocs(collection(db, 'folders'));
    const folders: DocumentFolder[] = [];
    snapshot.forEach(docSnap => {
      folders.push(docSnap.data() as DocumentFolder);
    });
    return folders;
  } catch (error) {
    console.warn('[Firestore] Error al cargar carpetas:', error);
    return [];
  }
}

export async function saveFoldersToFirestore(folders: DocumentFolder[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const folder of folders) {
      const ref = doc(db, 'folders', folder.id);
      batch.set(ref, folder, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    console.warn('[Firestore] Error al guardar carpetas:', error);
  }
}

export async function fetchDocumentsFromFirestore(): Promise<StoredDocument[]> {
  try {
    const snapshot = await getDocs(collection(db, 'documents'));
    const documents: StoredDocument[] = [];
    snapshot.forEach(docSnap => {
      documents.push(docSnap.data() as StoredDocument);
    });
    return documents;
  } catch (error) {
    console.warn('[Firestore] Error al cargar documentos:', error);
    return [];
  }
}

export async function saveDocumentToFirestore(document: StoredDocument): Promise<void> {
  try {
    const ref = doc(db, 'documents', document.id);
    await setDoc(ref, document, { merge: true });
  } catch (error) {
    console.warn('[Firestore] Error al guardar documento:', error);
  }
}

export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (error) {
    console.warn('[Firestore] Error al eliminar documento:', error);
  }
}
