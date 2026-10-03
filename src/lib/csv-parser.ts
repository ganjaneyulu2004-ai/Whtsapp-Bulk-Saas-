import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ParsedContact {
  name: string;
  originalPhone: string;
  cleanPhone: string;
  isValid: boolean;
  isDuplicate: boolean;
  reason?: string;
}

export interface ParseResult {
  headers: string[];
  contacts: ParsedContact[];
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  detectedNameCol: string;
  detectedPhoneCol: string;
  nameColIndex: number;
  phoneColIndex: number;
  previewRows: ParsedContact[];
}

export function normalizePhone(rawPhone: string): { cleanPhone: string; isValid: boolean; reason?: string } {
  if (!rawPhone) return { cleanPhone: "", isValid: false, reason: "Empty phone number" };

  // Remove spaces, hyphens, parentheses, plus signs
  let digits = rawPhone.toString().replace(/[^0-9]/g, "");

  if (digits.length === 0) {
    return { cleanPhone: "", isValid: false, reason: "No numeric digits found" };
  }

  // Handle 10-digit Indian numbers starting with 6, 7, 8, 9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return { cleanPhone: `91${digits}`, isValid: true };
  }

  // Handle 11-digit numbers starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return { cleanPhone: `91${digits.slice(1)}`, isValid: true };
  }

  // Handle 12-digit Indian numbers starting with 91
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return { cleanPhone: digits, isValid: true };
  }

  // General international check (between 10 and 15 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return { cleanPhone: digits, isValid: true };
  }

  return {
    cleanPhone: digits,
    isValid: false,
    reason: `Invalid digit length (${digits.length}) or format`,
  };
}

export function autoDetectColumns(headers: string[]): { nameColIndex: number; phoneColIndex: number } {
  let nameColIndex = -1;
  let phoneColIndex = -1;

  const nameExactPatterns = [
    /^(full\s*name|customer\s*name|contact\s*name|client\s*name|recipient\s*name|person\s*name)$/i,
    /^(name|customer|client|recipient|person|contact|పేరు)$/i,
  ];

  const nameFuzzyPatterns = [
    /(full\s*name|customer\s*name|contact\s*name)/i,
    /(name|customer|recipient)/i,
  ];

  const phoneExactPatterns = [
    /^(phone\s*number|mobile\s*number|whatsapp\s*number|wa\s*number|contact\s*number|cell\s*number)$/i,
    /^(phone|mobile|whatsapp|contact|cell|tel|ఫోన్|నంబర్)$/i,
  ];

  const phoneFuzzyPatterns = [
    /(phone|mobile|whatsapp|contact|number)/i,
  ];

  // Detect Name column
  for (const pat of nameExactPatterns) {
    const idx = headers.findIndex((h) => pat.test(h.trim()));
    if (idx !== -1) {
      nameColIndex = idx;
      break;
    }
  }
  if (nameColIndex === -1) {
    for (const pat of nameFuzzyPatterns) {
      const idx = headers.findIndex((h) => pat.test(h.trim()));
      if (idx !== -1) {
        nameColIndex = idx;
        break;
      }
    }
  }

  // Detect Phone column (must not be the same as nameColIndex)
  for (const pat of phoneExactPatterns) {
    const idx = headers.findIndex((h, i) => i !== nameColIndex && pat.test(h.trim()));
    if (idx !== -1) {
      phoneColIndex = idx;
      break;
    }
  }
  if (phoneColIndex === -1) {
    for (const pat of phoneFuzzyPatterns) {
      const idx = headers.findIndex((h, i) => i !== nameColIndex && pat.test(h.trim()));
      if (idx !== -1) {
        phoneColIndex = idx;
        break;
      }
    }
  }

  // Defaults if detection didn't match
  if (nameColIndex === -1) nameColIndex = 0;
  if (phoneColIndex === -1) phoneColIndex = headers.length > 1 ? 1 : 0;

  return { nameColIndex, phoneColIndex };
}

export function parseCsvOrExcelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  userSpecifiedNameCol?: number,
  userSpecifiedPhoneCol?: number
): ParseResult {
  let rawRows: any[][] = [];

  if (fileName.endsWith(".csv") || fileName.endsWith(".txt")) {
    const text = new TextDecoder().decode(buffer);
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    rawRows = parsed.data as any[][];
  } else {
    // Excel file (.xlsx, .xls)
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  }

  if (!rawRows || rawRows.length === 0) {
    return {
      headers: [],
      contacts: [],
      totalRows: 0,
      validCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      detectedNameCol: "Name",
      detectedPhoneCol: "Phone",
      nameColIndex: 0,
      phoneColIndex: 1,
      previewRows: [],
    };
  }

  // Extract headers
  const headers = rawRows[0].map((h: any) => String(h || "").trim());
  const dataRows = rawRows.slice(1);

  // Auto-detect columns if not manually chosen
  const detected = autoDetectColumns(headers);
  const actualNameColIndex = typeof userSpecifiedNameCol === "number" && userSpecifiedNameCol >= 0 
    ? userSpecifiedNameCol 
    : detected.nameColIndex;
  const actualPhoneColIndex = typeof userSpecifiedPhoneCol === "number" && userSpecifiedPhoneCol >= 0 
    ? userSpecifiedPhoneCol 
    : detected.phoneColIndex;

  const seenPhones = new Set<string>();
  const contacts: ParsedContact[] = [];

  let validCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    // Read contact name strictly from the detected/uploaded name column
    const cellValue = row[actualNameColIndex];
    let rawName = typeof cellValue === "string" 
      ? cellValue.replace(/\s+/g, " ").trim() 
      : String(cellValue || "").trim();

    if (!rawName || rawName.toLowerCase() === "undefined" || rawName.toLowerCase() === "null") {
      rawName = "Customer";
    }

    const rawPhone = String(row[actualPhoneColIndex] || "").trim();
    const norm = normalizePhone(rawPhone);

    if (!norm.isValid) {
      invalidCount++;
      contacts.push({
        name: rawName,
        originalPhone: rawPhone,
        cleanPhone: norm.cleanPhone,
        isValid: false,
        isDuplicate: false,
        reason: norm.reason,
      });
      continue;
    }

    if (seenPhones.has(norm.cleanPhone)) {
      duplicateCount++;
      contacts.push({
        name: rawName,
        originalPhone: rawPhone,
        cleanPhone: norm.cleanPhone,
        isValid: true,
        isDuplicate: true,
        reason: "Duplicate number in file",
      });
      continue;
    }

    seenPhones.add(norm.cleanPhone);
    validCount++;

    contacts.push({
      name: rawName,
      originalPhone: rawPhone,
      cleanPhone: norm.cleanPhone,
      isValid: true,
      isDuplicate: false,
    });
  }

  return {
    headers,
    contacts,
    totalRows: dataRows.length,
    validCount,
    duplicateCount,
    invalidCount,
    detectedNameCol: headers[actualNameColIndex] || `Column ${actualNameColIndex + 1}`,
    detectedPhoneCol: headers[actualPhoneColIndex] || `Column ${actualPhoneColIndex + 1}`,
    nameColIndex: actualNameColIndex,
    phoneColIndex: actualPhoneColIndex,
    previewRows: contacts.slice(0, 5),
  };
}
