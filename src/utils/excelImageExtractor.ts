import JSZip from 'jszip';
import { compressDataUrl } from './imageCompressor';

export interface ExtractedImage {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sheetName?: string;
  rowIndex?: number; // 0-based row index in rawData
  colIndex?: number; // 0-based column index
  isAnchoredToRow?: boolean;
}

/**
 * Extracts embedded images stored inside an Excel (.xlsx) file,
 * and maps each image to the EXACT sheet and row where it is anchored.
 */
export async function extractImagesFromExcel(
  fileBuffer: ArrayBuffer,
  sheetNames: string[] = []
): Promise<ExtractedImage[]> {
  try {
    const zip = await JSZip.loadAsync(fileBuffer);
    const mediaMap: Record<string, { mimeType: string; dataUrl: string; cleanName: string }> = {};

    // 1. Read all media files in xl/media/
    const mediaFiles = Object.keys(zip.files).filter(fileName => 
      fileName.toLowerCase().startsWith('xl/media/') || 
      fileName.toLowerCase().startsWith('word/media/')
    );

    for (const fileName of mediaFiles) {
      const zipEntry = zip.files[fileName];
      if (zipEntry.dir) continue;

      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      let mimeType = 'image/png';
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'bmp') mimeType = 'image/bmp';
      else if (ext === 'svg') mimeType = 'image/svg+xml';

      const rawBase64 = await zipEntry.async('base64');
      const base64Data = rawBase64.replace(/\s/g, '');
      const rawDataUrl = `data:${mimeType};base64,${base64Data}`;
      // Downscale and optimize resolution for smooth platform performance
      const dataUrl = await compressDataUrl(rawDataUrl, 1280, 1280, 0.80);
      const cleanName = fileName.split('/').pop() || `imagen.${ext}`;

      mediaMap[fileName.toLowerCase()] = { mimeType: 'image/jpeg', dataUrl, cleanName };
    }

    // 2. Map workbook sheets to sheet XML files
    const sheetToXmlFile: Record<string, string> = {};
    const wbXml = await zip.file('xl/workbook.xml')?.async('string');
    const wbRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');

    if (wbXml && wbRelsXml) {
      const relMap: Record<string, string> = {};
      const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi;
      let rm;
      while ((rm = relRegex.exec(wbRelsXml)) !== null) {
        relMap[rm[1]] = rm[2];
      }

      const sheetRegex = /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/gi;
      let sm;
      while ((sm = sheetRegex.exec(wbXml)) !== null) {
        const sName = sm[1];
        const rId = sm[2];
        const target = (relMap[rId] || 'sheet1.xml').replace(/^worksheets\//, '').replace(/.*\/([^/]+)$/, '$1');
        sheetToXmlFile[sName] = target;
      }
    } else if (sheetNames.length > 0) {
      // Fallback: 1-to-1 sheet matching
      sheetNames.forEach((name, idx) => {
        sheetToXmlFile[name] = `sheet${idx + 1}.xml`;
      });
    }

    // 3. For each sheet, map to its drawing XML and anchors
    const anchoredImages: ExtractedImage[] = [];
    const usedMediaKeys = new Set<string>();

    for (const [sheetName, xmlFile] of Object.entries(sheetToXmlFile)) {
      const relContent = await zip.file(`xl/worksheets/_rels/${xmlFile}.rels`)?.async('string');
      if (!relContent) continue;

      const drawMatch = relContent.match(/Target="[^"]*drawings\/([^"]+)"/i);
      if (!drawMatch) continue;
      const drawFile = drawMatch[1];

      const drawXml = await zip.file(`xl/drawings/${drawFile}`)?.async('string');
      const drawRelsXml = await zip.file(`xl/drawings/_rels/${drawFile}.rels`)?.async('string');
      if (!drawXml || !drawRelsXml) continue;

      // Map drawing relationship IDs to media file paths
      const imgRels: Record<string, string> = {};
      const dRelRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi;
      let dm;
      while ((dm = dRelRegex.exec(drawRelsXml)) !== null) {
        const target = dm[2].replace(/^\.\.\/media\//i, 'xl/media/').replace(/^media\//i, 'xl/media/').toLowerCase();
        imgRels[dm[1]] = target;
      }

      // Parse twoCellAnchor and oneCellAnchor blocks
      const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/gi;
      let am;
      while ((am = anchorRegex.exec(drawXml)) !== null) {
        const content = am[1];
        const rowM = content.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/i);
        const colM = content.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/i);
        const embedM = content.match(/<a:blip[^>]*(?:r:embed|r:link)="([^"]+)"/i);

        if (rowM && embedM) {
          const rowIdx = parseInt(rowM[1], 10);
          const colIdx = colM ? parseInt(colM[1], 10) : 0;
          const targetPath = imgRels[embedM[1]];

          if (targetPath && mediaMap[targetPath]) {
            const media = mediaMap[targetPath];
            usedMediaKeys.add(targetPath);

            anchoredImages.push({
              id: `anchored-${sheetName}-row-${rowIdx}-${anchoredImages.length}-${Date.now()}`,
              name: media.cleanName,
              mimeType: media.mimeType,
              dataUrl: media.dataUrl,
              sheetName,
              rowIndex: rowIdx,
              colIndex: colIdx,
              isAnchoredToRow: true,
            });
          }
        }
      }
    }

    // 4. Any media files that were not anchored in drawings
    const unanchoredImages: ExtractedImage[] = [];
    Object.entries(mediaMap).forEach(([key, media], idx) => {
      if (!usedMediaKeys.has(key)) {
        unanchoredImages.push({
          id: `unanchored-${idx}-${Date.now()}`,
          name: media.cleanName,
          mimeType: media.mimeType,
          dataUrl: media.dataUrl,
          isAnchoredToRow: false,
        });
      }
    });

    // Return anchored images first (ordered by row), followed by any unanchored
    anchoredImages.sort((a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0));
    return [...anchoredImages, ...unanchoredImages];
  } catch (err) {
    console.warn('Error extracting images or drawings from Excel:', err);
    return [];
  }
}
