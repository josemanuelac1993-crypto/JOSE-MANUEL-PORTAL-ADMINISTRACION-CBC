import { Incident } from '../types';

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  description?: string;
}

export interface DriveSearchFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

const BACKUP_FOLDER_NAME = 'Tesalia CBC - Respaldos Liderman';

/**
 * Finds or creates the dedicated backup folder in Google Drive
 */
export async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(`name = '${BACKUP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!searchRes.ok) {
    throw new Error(`Error al buscar carpeta en Drive: ${searchRes.statusText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Carpeta oficial de respaldos periódicos del sistema de seguridad Liderman - Tesalia CBC',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Error al crear carpeta en Google Drive: ${createRes.statusText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

// Helper to ensure an image is fully embedded as a data URL before backing up
async function resolveImageToDataUrl(imgUrl: string): Promise<string> {
  if (!imgUrl || typeof imgUrl !== 'string') return '';
  if (imgUrl.startsWith('data:image/')) return imgUrl;

  try {
    const res = await fetch(imgUrl);
    if (res.ok) {
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || imgUrl);
        reader.onerror = () => resolve(imgUrl);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn('[Backup] No se pudo convertir URL relativa a dataUrl:', imgUrl, e);
  }
  return imgUrl;
}

/**
 * Creates a timestamped backup in Google Drive containing all incidents, metadata, and fully embedded images
 */
export async function saveIncidentsBackupToDrive(
  accessToken: string,
  incidents: Incident[],
  note?: string
): Promise<DriveBackupFile> {
  const folderId = await getOrCreateBackupFolder(accessToken);
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `Respaldo_Tesalia_Liderman_${dateStr}.json`;

  // Fortify and embed all photographic evidence directly into the JSON backup payload
  let totalImagesCount = 0;
  const fortifiedIncidents = await Promise.all(
    incidents.map(async (inc) => {
      if (!Array.isArray(inc.evidenceImages) || inc.evidenceImages.length === 0) {
        return inc;
      }
      const embeddedImages = await Promise.all(
        inc.evidenceImages.map(img => resolveImageToDataUrl(img))
      );
      const validImages = embeddedImages.filter(Boolean);
      totalImagesCount += validImages.length;
      return {
        ...inc,
        evidenceImages: validImages
      };
    })
  );

  const payload = {
    version: '2026.2',
    timestamp: now.toISOString(),
    recordsCount: fortifiedIncidents.length,
    imagesCount: totalImagesCount,
    hasEmbeddedImages: totalImagesCount > 0,
    note: note || 'Respaldo con imágenes fotográficas de alta resolución embebidas',
    system: 'Liderman Seguridad & SSOMA - Tesalia CBC',
    incidents: fortifiedIncidents,
  };

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: `Respaldo de ${fortifiedIncidents.length} novedades de seguridad con ${totalImagesCount} imágenes fotográficas y capturas CCTV integradas. ${note || ''}`,
  };

  // Multipart upload to Google Drive
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(payload, null, 2) +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Error al guardar archivo en Google Drive: ${errText}`);
  }

  const uploaded = await uploadRes.json();
  return {
    id: uploaded.id,
    name: fileName,
    createdTime: now.toISOString(),
    description: fileMetadata.description,
  };
}

/**
 * Lists all previous backups stored in the Google Drive folder
 */
export async function listDriveBackups(accessToken: string): Promise<DriveBackupFile[]> {
  const folderId = await getOrCreateBackupFolder(accessToken);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id, name, createdTime, size, description)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Error al listar respaldos de Google Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Restores a backup from Google Drive by file ID
 */
export async function downloadBackupFromDrive(
  accessToken: string,
  fileId: string
): Promise<{ incidents: Incident[]; timestamp: string; note?: string }> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Error al descargar respaldo de Drive: ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.incidents)) {
    throw new Error('El archivo de respaldo no tiene el formato esperado de novedades.');
  }

  return {
    incidents: data.incidents,
    timestamp: data.timestamp || new Date().toISOString(),
    note: data.note,
  };
}

/**
 * Search Google Drive for spreadsheets and Excel files to import
 */
export async function searchDriveSpreadsheets(accessToken: string): Promise<DriveSearchFile[]> {
  const query = encodeURIComponent(
    "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.ms-excel' or name contains '.xlsx' or name contains '.xls' or name contains '.csv') and trashed = false"
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=30&fields=files(id, name, mimeType, modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Error al buscar hojas de cálculo en Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads binary content of an Excel file from Google Drive
 */
export async function downloadExcelFromDrive(accessToken: string, fileId: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Error al descargar archivo Excel de Google Drive: ${res.statusText}`);
  }

  return await res.arrayBuffer();
}

/**
 * Deletes a backup from Google Drive (Requires explicit user confirmation)
 */
export async function deleteDriveBackupFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Error al eliminar archivo de Drive: ${res.statusText}`);
  }
}
