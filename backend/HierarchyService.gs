/**
 * HierarchyService.gs
 * Single source of truth for sheet traversal and natural-key extraction.
 */

const HIERARCHY_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function hierarchyNormalizeText(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function hierarchyToTitleCase(value) {
  const text = hierarchyNormalizeText(value);
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(token => token ? token[0].toUpperCase() + token.slice(1) : token)
    .join(" ");
}

function hierarchyFormatDateValue(value) {
  if (value === undefined || value === null || value.toString().trim() === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const year = String(value.getFullYear());
    return month + "/" + day + "/" + year;
  }
  return hierarchyNormalizeText(value);
}

function hierarchyIsTrackingPeriod(text) {
  const normalized = hierarchyNormalizeText(text).toUpperCase();
  if (!normalized) return false;

  const exactMatches = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
    "1ST QUARTER", "2ND QUARTER", "3RD QUARTER", "4TH QUARTER",
    "Q1", "Q2", "Q3", "Q4", "WEEKLY", "ONE-TIME", "ANNUAL", "SEMESTRAL"
  ];

  if (exactMatches.includes(normalized)) return true;
  if (normalized.includes("ROUND") || normalized.includes("VISIT") || normalized.includes("MODULE") || normalized.includes("POPCEN") || normalized.includes("CBMS") || /^\d{4}\s/.test(normalized)) return true;
  return false;
}

function hierarchySplitReportTitle(reportTitle) {
  const normalized = hierarchyNormalizeText(reportTitle);
  if (!normalized) return { frequency: "", category: "" };

  const parts = normalized.split("➔").map(part => hierarchyToTitleCase(part));
  if (parts.length > 1) {
    return { frequency: parts[0], category: parts.slice(1).join(" ➔ ") };
  }

  return { frequency: hierarchyToTitleCase(normalized), category: "" };
}

function hierarchyNaturalKeyString(key) {
  return [key.frequency, key.category, key.task, key.period]
    .map(part => hierarchyNormalizeText(part).toLowerCase())
    .join("||");
}

function hierarchyMakeEntry(key, location, values) {
  return {
    key: {
      frequency: hierarchyToTitleCase(key.frequency),
      category: hierarchyToTitleCase(key.category),
      task: hierarchyNormalizeText(key.task),
      period: hierarchyNormalizeText(key.period)
    },
    location: {
      sheet: hierarchyNormalizeText(location.sheet),
      row: location.row,
      dateColumn: location.dateColumn,
      deadlineColumn: location.deadlineColumn
    },
    values: {
      submitted: hierarchyFormatDateValue(values.submitted),
      deadline: hierarchyFormatDateValue(values.deadline),
      personInCharge: hierarchyNormalizeText(values.personInCharge),
      remarks: hierarchyNormalizeText(values.remarks)
    }
  };
}

function hierarchyExtractAdminEntries(config, rawData, lastCol) {
  const entries = [];
  const blocks = [];
  let currentBlock = {};

  if (rawData.length > 2) {
    const row3 = rawData[2];
    for (let c = 2; c < lastCol; c++) {
      const header = hierarchyNormalizeText(row3[c]).toUpperCase();
      if (header.includes("DEADLINE")) currentBlock.deadline = c;
      else if (header.includes("SUBMITTED") || header.includes("SUBMISSION")) currentBlock.submitted = c;
      else if (header.includes("STATUS")) {
        currentBlock.status = c;
        blocks.push(currentBlock);
        currentBlock = {};
      }
    }
  }

  let currentFrequency = "";
  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    const taskName = hierarchyNormalizeText(row[0]);
    if (!taskName) continue;

    const normalizedTaskName = taskName.replace(/\s+/g, " ").toUpperCase();
    if (Array.isArray(ADMIN_FREQUENCIES) && ADMIN_FREQUENCIES.indexOf(normalizedTaskName) !== -1) {
      currentFrequency = normalizedTaskName;
      continue;
    }
    if (Array.isArray(ADMIN_CATEGORIES) && ADMIN_CATEGORIES.indexOf(normalizedTaskName) !== -1) continue;
    if (r < config.dataStartRow - 1) continue;

    const hierarchy = getAdminHierarchy(taskName);
    if (!hierarchy) continue;
    const frequencyKey = "f" + "req";
    const categoryKey = "c" + "at";
    const taskKey = "r" + "ep";

    let periodNames = [];
    if (currentFrequency.includes("MONTHLY")) periodNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    else if (currentFrequency.includes("QUARTERLY")) periodNames = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];
    else if (currentFrequency.includes("SEMESTRAL")) periodNames = ["1st Semester", "2nd Semester"];
    else if (currentFrequency.includes("ANNUAL")) periodNames = ["Annual"];

    for (let i = 0; i < periodNames.length; i++) {
      if (!blocks[i]) continue;

      entries.push(hierarchyMakeEntry(
        {
          frequency: hierarchy[frequencyKey],
          category: hierarchy[categoryKey] || "",
          task: hierarchy[taskKey],
          period: periodNames[i]
        },
        {
          sheet: config.sheetName,
          row: r + 1,
          dateColumn: blocks[i].submitted !== undefined ? blocks[i].submitted + 1 : null,
          deadlineColumn: blocks[i].deadline !== undefined ? blocks[i].deadline + 1 : null
        },
        {
          submitted: row[blocks[i].submitted],
          deadline: row[blocks[i].deadline],
          personInCharge: row[1],
          remarks: ""
        }
      ));
    }
  }

  return entries;
}

function hierarchyExtractStatisticalEntries(config, rawData, lastCol) {
  const entries = [];

  let headerRowIndex = -1;
  let metricGroupRowIndex = -1;
  for (let r = 0; r < 10 && r < rawData.length; r++) {
    for (let c = 0; c < rawData[r].length; c++) {
      const cellVal = hierarchyNormalizeText(rawData[r][c]).toUpperCase();
      if (cellVal.includes("STATUS") || cellVal.includes("DATE SUBMITTED") || cellVal.includes("DATE OF SUBMISSION")) {
        headerRowIndex = r;
        metricGroupRowIndex = r - 1;
        break;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  if (headerRowIndex === -1) return entries;

  const headerRow = rawData[headerRowIndex];
  const metricGroupRow = metricGroupRowIndex >= 0 ? rawData[metricGroupRowIndex] : [];
  const statusColumns = [];
  let remarksColIndex = -1;

  for (let i = 1; i < lastCol; i++) {
    const colText = hierarchyNormalizeText(headerRow[i]).toUpperCase();
    if (colText.includes("STATUS")) {
      let metricName = "General Data";
      for (let j = i; j >= 1; j--) {
        if (metricGroupRow[j] && hierarchyNormalizeText(metricGroupRow[j]) !== "") {
          metricName = hierarchyNormalizeText(metricGroupRow[j]);
          break;
        }
      }

      let deadlineIndex = -1;
      let submittedIndex = -1;
      for (let offset = 1; offset <= 2; offset++) {
        if (i - offset >= 0) {
          const headerText = hierarchyNormalizeText(headerRow[i - offset]).toUpperCase();
          if (headerText.includes("DEADLINE")) deadlineIndex = i - offset;
          else if (headerText.includes("SUBMITTED") || headerText.includes("SUBMISSION")) submittedIndex = i - offset;
        }
      }

      statusColumns.push({ index: i, metricName: metricName, deadlineIndex: deadlineIndex, submittedIndex: submittedIndex });
    }
    if (colText.includes("REMARKS")) remarksColIndex = i;
  }

  const strictlyGeneralSheets = ["ID", "PHILSYS", "PL", "SPC", "CIVIL REGISTRATION"];
  if (strictlyGeneralSheets.includes(config.sheetName.toUpperCase()) && statusColumns.length > 0) {
    statusColumns.splice(1);
    statusColumns[0].metricName = "General Data";
  }

  let currentTrackedPeriod = "Annual/Ongoing";
  let currentReportTitle = config.reportName;

  for (let r = config.dataStartRow - 1; r < rawData.length; r++) {
    const row = rawData[r];
    const rowColA = row[0] ? (Object.prototype.toString.call(row[0]) === "[object Date]" ? HIERARCHY_MONTHS[row[0].getMonth()] : hierarchyNormalizeText(row[0])) : "";
    if (rowColA.toUpperCase() === "STATISTICAL OPERATIONS" || 
        rowColA.toUpperCase() === "CIVIL REGISTRATION ACTIVITIES" || 
        rowColA.toUpperCase() === "MONTHLY ACTIVITIES" || 
        rowColA.toUpperCase() === "MONTLHY ACTIVITIES") continue;

    if (rowColA !== "") {
      if (hierarchyIsTrackingPeriod(rowColA)) currentTrackedPeriod = rowColA;
      else {
        currentReportTitle = rowColA;
        continue;
      }
    }

    const reportLabel = hierarchySplitReportTitle(currentReportTitle);
    const remarksVal = (remarksColIndex !== -1 && row[remarksColIndex]) ? hierarchyNormalizeText(row[remarksColIndex]) : "";

    statusColumns.forEach(statusCol => {
      const deadlineValRaw = statusCol.deadlineIndex !== -1 ? row[statusCol.deadlineIndex] : null;
      const submittedValRaw = statusCol.submittedIndex !== -1 ? row[statusCol.submittedIndex] : null;
      const deadlineStr = hierarchyFormatDateValue(deadlineValRaw);
      const submittedStr = hierarchyFormatDateValue(submittedValRaw);

      if (rowColA === "" && deadlineStr === "" && submittedStr === "" && (!row[statusCol.index] || hierarchyNormalizeText(row[statusCol.index]) === "")) return;

      entries.push(hierarchyMakeEntry(
        {
          frequency: reportLabel.frequency,
          category: reportLabel.category,
          task: statusCol.metricName || "General Data",
          period: currentTrackedPeriod
        },
        {
          sheet: config.sheetName,
          row: r + 1,
          dateColumn: statusCol.submittedIndex !== -1 ? statusCol.submittedIndex + 1 : null,
          deadlineColumn: statusCol.deadlineIndex !== -1 ? statusCol.deadlineIndex + 1 : null
        },
        {
          submitted: submittedValRaw,
          deadline: deadlineValRaw,
          personInCharge: currentReportTitle === config.reportName ? (row[1] || "N/A") : (row[1] || "N/A"),
          remarks: remarksVal
        }
      ));
    });
  }

  return entries;
}

function extractHierarchy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configs = getActiveConfigurations();
  const entries = [];

  configs.forEach(config => {
    const targetSheet = ss.getSheetByName(config.sheetName);
    if (!targetSheet) return;

    const lastRow = targetSheet.getLastRow();
    const lastCol = targetSheet.getLastColumn();
    if (lastRow < 1) return;

    const rawData = targetSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const isAdminSheet = config.parserType === "ADMIN_HR" || config.sheetName.toUpperCase().includes("ADMIN");
    const sourceEntries = isAdminSheet
      ? hierarchyExtractAdminEntries(config, rawData, lastCol)
      : hierarchyExtractStatisticalEntries(config, rawData, lastCol);

    sourceEntries.forEach(entry => entries.push(entry));
  });

  return entries;
}

function buildHierarchyLookup(entries) {
  const lookup = {};
  entries.forEach(entry => {
    const key = hierarchyNaturalKeyString(entry.key);
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(entry);
  });
  return lookup;
}

function buildCsvTemplateRows() {
  return extractHierarchy().map(entry => [
    entry.key.frequency,
    entry.key.category,
    entry.key.task,
    entry.key.period,
    ""
  ]);
}