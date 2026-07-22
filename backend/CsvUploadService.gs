/**
 * CsvUploadService.gs
 * Handles CSV template generation and upload writes using absolute cell anchors.
 */

function csvNormalizeHeader(value) {
  return hierarchyNormalizeText(value).toLowerCase();
}

function csvParseDateValue(value) {
  const text = hierarchyNormalizeText(value);
  if (!text) return null;

  const directDate = new Date(text);
  if (!isNaN(directDate.getTime())) return directDate;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function csvRowToKeyObject(headers, row) {
  const rowMap = {};
  headers.forEach((header, index) => {
    rowMap[csvNormalizeHeader(header)] = hierarchyNormalizeText(row[index]);
  });

  return {
    frequency: rowMap["frequency"] || rowMap["report frequency"] || "",
    category: rowMap["category"] || "",
    task: rowMap["task"] || rowMap["metric"] || "",
    period: rowMap["period"] || rowMap["month"] || ""
  };
}

function csvBuildHierarchyKey(key) {
  return hierarchyNaturalKeyString({
    frequency: key.frequency, category: key.category, task: key.task, period: key.period
  });
}

function csvBuildTemplateCsv() {
  const rows = buildCsvTemplateRows();
  const lines = ["Frequency,Category,Task,Period,Date Submitted,_Sheet,_Row,_DateCol"];
  rows.forEach(row => {
    lines.push(row.map(value => '"' + String(value || "").replace(/"/g, '""') + '"').join(","));
  });
  return lines.join("\n");
}

function buildCsvTemplateRows() {
  return extractHierarchy().map(entry => [
    entry.key.frequency,
    entry.key.category,
    entry.key.task,
    entry.key.period,
    "",
    entry.location.sheet,
    entry.location.row,
    entry.location.dateColumn
  ]);
}

function handleCsvDownloadTemplate() {
  return csvBuildTemplateCsv();
}

function handleCsvUpload(e) {
  const csvText = (e && e.parameter && e.parameter.csvData) ? String(e.parameter.csvData) :
                  (e && e.postData && e.postData.contents ? String(e.postData.contents) : "");
                  
  if (!csvText.trim()) return { updated: 0, skipped: 0, errors: ["Uploaded CSV body is empty."] };

  const rows = Utilities.parseCsv(csvText);
  if (!rows || rows.length < 2) return { updated: 0, skipped: 0, errors: ["CSV file must include a header row and at least one data row."] };

  const originalHeaders = rows[0];
  const headers = originalHeaders.map(h => hierarchyNormalizeText(h).toLowerCase());
  const dataRows = rows.slice(1);
  
  const hierarchyEntries = extractHierarchy();
  const lookup = buildHierarchyLookup(hierarchyEntries);
  const sheetCache = {};
  
  let updated = 0; let skipped = 0; const errors = [];

  const dateIndex = headers.indexOf("date submitted") !== -1 ? headers.indexOf("date submitted") : 4;
  const sheetIndex = headers.indexOf("_sheet");
  const rowIndexVal = headers.indexOf("_row");
  const dateColumnIndex = headers.indexOf("_datecol");

  dataRows.forEach((row, rowIndex) => {
    const csvRowNumber = rowIndex + 2;
    const uploadedDate = row[dateIndex] !== undefined ? row[dateIndex] : "";
    const targetDate = csvParseDateValue(uploadedDate);

    // --- APPROACH A: UNAMBIGUOUS DIRECT ANCHOR MATCH ---
    if (sheetIndex !== -1 && rowIndexVal !== -1 && dateColumnIndex !== -1) {
      const sheetName = row[sheetIndex];
      const rowNum = row[rowIndexVal];
      const colNum = row[dateColumnIndex];
      
      if (sheetName && rowNum && colNum) {
        if (uploadedDate && !targetDate) { skipped++; errors.push(`Row ${csvRowNumber}: invalid Date Submitted format.`); return; }
        if (!sheetCache[sheetName]) sheetCache[sheetName] = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        
        const targetSheet = sheetCache[sheetName];
        if (!targetSheet) { skipped++; errors.push(`Row ${csvRowNumber}: target sheet '${sheetName}' not found.`); return; }
        
        targetSheet.getRange(Number(rowNum), Number(colNum)).setValue(targetDate || "");
        updated++;
        return; 
      }
    }

    // --- APPROACH B: LEGACY NATURAL KEY MATCH FALLBACK ---
    const keyObj = csvRowToKeyObject(originalHeaders, row);
    const naturalKey = csvBuildHierarchyKey(keyObj);

    if (!keyObj.frequency || !keyObj.task || !keyObj.period) {
      skipped++; errors.push(`Row ${csvRowNumber}: missing required key fields or anchor columns.`); return;
    }

    const matches = lookup[naturalKey] || [];
    if (matches.length === 0) { skipped++; errors.push(`Row ${csvRowNumber}: no live hierarchy match found.`); return; }
    if (matches.length > 1) { skipped++; errors.push(`Row ${csvRowNumber}: ambiguous hierarchy match. Use a fresh template with _Row anchors.`); return; }
    if (uploadedDate && !targetDate) { skipped++; errors.push(`Row ${csvRowNumber}: invalid Date Submitted value.`); return; }

    const match = matches[0];
    if (!match.location.sheet || !match.location.row || !match.location.dateColumn) {
      skipped++; errors.push(`Row ${csvRowNumber}: matched record missing writable sheet location.`); return;
    }

    if (!sheetCache[match.location.sheet]) sheetCache[match.location.sheet] = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(match.location.sheet);
    const targetSheet = sheetCache[match.location.sheet];
    if (!targetSheet) { skipped++; errors.push(`Row ${csvRowNumber}: sheet ${match.location.sheet} not found.`); return; }

    targetSheet.getRange(match.location.row, match.location.dateColumn).setValue(targetDate || "");
    updated++;
  });

  return { updated: updated, skipped: skipped, errors: errors };
}

function handleSingleRecordUpdateDirect(data) {
  if (!data.sheet || !data.row || !data.dateColumn) {
    throw new Error("Missing direct cell reference data. Please refresh the dashboard.");
  }
  const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(data.sheet);
  if (!targetSheet) throw new Error("Target sheet missing or renamed.");

  const targetDate = csvParseDateValue(data.submittedDate);
  if (data.submittedDate && !targetDate) throw new Error("Invalid date format.");
  
  targetSheet.getRange(Number(data.row), Number(data.dateColumn)).setValue(targetDate || "");
  
  return { updated: 1, skipped: 0, errors: [] };
}

function handleSingleRecordUpdate(data) {
  const hierarchyEntries = extractHierarchy();
  const lookup = buildHierarchyLookup(hierarchyEntries);
  
  const naturalKey = hierarchyNaturalKeyString({
    frequency: data.frequency, category: data.category,
    task: data.task, period: data.period
  });

  const matches = lookup[naturalKey] || [];
  if (matches.length === 0) throw new Error("Record not found in the live database.");
  if (matches.length > 1) throw new Error("Ambiguous record match.");

  const match = matches[0];
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(match.location.sheet);
  if (!sheet) throw new Error("Target sheet missing.");

  const targetDate = csvParseDateValue(data.submittedDate);
  if (data.submittedDate && !targetDate) throw new Error("Invalid date format.");
  
  sheet.getRange(match.location.row, match.location.dateColumn).setValue(targetDate || "");
  
  return { updated: 1, skipped: 0, errors: [] };
}