import * as XLSX from 'xlsx';

export interface ProcessResult {
  success: boolean;
  message: string;
  pensionistasBlob?: Blob;
  aposentadosBlob?: Blob;
  stats: {
    baseTotal: number;
    baseFiltered: number; // After removing RGPS
    
    // Pensionistas Stats (Optional)
    pensionistasTotal?: number;
    pensionistasMatches?: number; // Rows in Base that match Pensionistas

    // Aposentados Stats (Optional)
    aposentadosTotal?: number;
    aposentadosMissing?: number; // Rows in Aposentados NOT found in Base
  };
}

/**
 * Normalizes a string to help find column headers fuzzily.
 */
export const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim();
};

/**
 * Strips non-numeric characters from a CPF string.
 */
export const cleanCpf = (value: unknown): string => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Finds a column name in a list of headers based on keywords.
 */
export const findColumnName = (headers: string[], keywords: string[]): string | undefined => {
  return headers.find(h => {
    const normalized = normalizeHeader(h);
    return keywords.some(k => normalized.includes(k));
  });
};

export const readFileAsJson = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const processFiles = async (
  baseFile: File,
  pensionistasFile: File | null,
  aposentadosFile: File | null
): Promise<ProcessResult> => {
  try {
    // 1. Read Base File (Mandatory)
    const baseData = await readFileAsJson(baseFile);
    if (baseData.length === 0) {
      return { success: false, message: "O arquivo da Base Geral está vazio.", stats: { baseTotal: 0, baseFiltered: 0 } };
    }

    // Identify Base Columns
    const baseHeaders = Object.keys(baseData[0]);
    const baseCpfCol = findColumnName(baseHeaders, ["cpf"]);
    const baseDestCol = findColumnName(baseHeaders, ["destinatario", "destinatário"]);

    if (!baseCpfCol) return { success: false, message: "Coluna de CPF não encontrada na Base Geral.", stats: { baseTotal: 0, baseFiltered: 0 } };

    // 2. Process Base Geral (Filter RGPS)
    let processedRows = 0;
    const baseFiltered = baseData.filter(row => {
      if (baseDestCol) {
        const destValue = String(row[baseDestCol] || "").toUpperCase();
        if (destValue.includes("RGPS")) {
          return false;
        }
      }
      processedRows++;
      return true;
    });

    // Create Set of Valid CPFs from FILTERED Base
    const baseCpfSet = new Set<string>();
    baseFiltered.forEach(row => {
      const c = cleanCpf(row[baseCpfCol]);
      if (c) baseCpfSet.add(c);
    });

    // Result Object
    const result: ProcessResult = {
      success: true,
      message: "Análise concluída com sucesso.",
      stats: {
        baseTotal: baseData.length,
        baseFiltered: processedRows,
      }
    };

    // 3. LOGIC: Pensionistas (MATCH) - Optional
    if (pensionistasFile) {
      const pensionistasData = await readFileAsJson(pensionistasFile);
      if (pensionistasData.length > 0) {
        const penHeaders = Object.keys(pensionistasData[0]);
        const penCpfCol = findColumnName(penHeaders, ["cpf", "cpf legador"]);

        if (penCpfCol) {
          // Create Set of Pensionista CPFs
          const pensionistaCpfSet = new Set<string>();
          pensionistasData.forEach(row => {
            const c = cleanCpf(row[penCpfCol]);
            if (c) pensionistaCpfSet.add(c);
          });

          // Filter BASE rows that match Pensionistas
          const pensionistasMatches = baseFiltered.filter(row => {
            const rowCpf = cleanCpf(row[baseCpfCol]);
            return pensionistaCpfSet.has(rowCpf);
          });

          // Generate Excel for Pensionistas
          const wbPen = XLSX.utils.book_new();
          const sheetPen = XLSX.utils.json_to_sheet(pensionistasMatches);
          XLSX.utils.book_append_sheet(wbPen, sheetPen, "Matches Pensionistas");
          const wboutPen = XLSX.write(wbPen, { bookType: 'xlsx', type: 'array' });
          result.pensionistasBlob = new Blob([wboutPen], { type: "application/octet-stream" });

          // Update Stats
          result.stats.pensionistasTotal = pensionistasData.length;
          result.stats.pensionistasMatches = pensionistasMatches.length;
        }
      }
    }

    // 4. LOGIC: Aposentados (MISMATCH / DIFF) - Optional
    if (aposentadosFile) {
      const aposentadosData = await readFileAsJson(aposentadosFile);
      if (aposentadosData.length > 0) {
        const apoHeaders = Object.keys(aposentadosData[0]);
        const apoCpfCol = findColumnName(apoHeaders, ["cpf"]);

        if (apoCpfCol) {
          // Find Aposentados rows that are NOT in Base
          const aposentadosMissing = aposentadosData.filter(row => {
            const rowCpf = cleanCpf(row[apoCpfCol]);
            // If CPF is NOT in Base Set, keep it (it's missing from base)
            return !baseCpfSet.has(rowCpf);
          });

          // Generate Excel for Aposentados
          const wbApo = XLSX.utils.book_new();
          const sheetApo = XLSX.utils.json_to_sheet(aposentadosMissing);
          XLSX.utils.book_append_sheet(wbApo, sheetApo, "Ausentes Aposentados");
          const wboutApo = XLSX.write(wbApo, { bookType: 'xlsx', type: 'array' });
          result.aposentadosBlob = new Blob([wboutApo], { type: "application/octet-stream" });

          // Update Stats
          result.stats.aposentadosTotal = aposentadosData.length;
          result.stats.aposentadosMissing = aposentadosMissing.length;
        }
      }
    }

    if (!pensionistasFile && !aposentadosFile) {
      return { success: false, message: "Nenhum arquivo de comparação (Pensionista ou Aposentado) foi fornecido.", stats: result.stats };
    }

    return result;

  } catch (err) {
    console.error(err);
    return { success: false, message: "Erro ao processar arquivos. Verifique os formatos.", stats: { baseTotal: 0, baseFiltered: 0 } };
  }
};