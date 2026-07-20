/**
 * Parser.gs
 * Ultra-resilient parser for OJT Final Presentation.
 * Automatically adapts to varying column structures (Deadline first vs Submission first).
 */

const ADMIN_FREQUENCIES = [
  "MONTHLY REPORTS", "MONTHLY REPORT", "QUARTERLY REPORTS", "QUARTERLY REPORT", 
  "SEMESTRAL REPORTS", "SEMESTRAL REPORT", "ANNUAL REPORTS", "ANNUAL REPORT"
];

const ADMIN_CATEGORIES = [
  "FINANCIAL REPORTS", "FINANCIAL REPORT", "FILING OF WITHHOLDING TAX", "FILING OF WITHHOLDING TAXES",
  "HUMAN RESOURCE", "HUMAN RESOURCES", "PROPERTY AND SUPPLIES", "PROPERTY AND SUPPLY",
  "COA SUBMISSION", "COA SUBMISSIONS", "GENDER AND DEVELOPMENT", 
  "SUBMISSION OF INDIVIDUAL PERFORMANCE COMMITMENT REVIEW",
  "SUBMISSION OF INDIVIDUAL PERFORMANCE COMMITMENT REVIEW (IPCR)", "STANDALONE REPORTS", "STANDALONE REPORT"
];

function formatDateClean(val) {
  if (val === undefined || val === null || val.toString().trim() === "") return "";
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "MM/dd/yyyy");
  return val.toString().trim();
}

function getCalculatedStatus(rawStatus, submittedVal, deadlineVal) {
  let sVal = rawStatus !== undefined && rawStatus !== null ? rawStatus.toString().trim() : "";
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  if (monthNames.includes(sVal.toUpperCase())) sVal = ""; 

  let hasSubmitted = (submittedVal !== undefined && submittedVal !== null && submittedVal.toString().trim() !== "");
  let hasDeadline = (deadlineVal !== undefined && deadlineVal !== null && deadlineVal.toString().trim() !== "");
  let finalStatus = (sVal !== "") ? sVal : "Pending";

  if (hasDeadline) {
    let dDate = new Date(deadlineVal);
    let today = new Date();
    dDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    
    if (!isNaN(dDate.getTime())) {
      if (!hasSubmitted) {
        finalStatus = (today.getTime() > dDate.getTime()) ? "Overdue" : "Pending";
      } else {
        let sDate = new Date(submittedVal);
        sDate.setHours(0,0,0,0);
        if (!isNaN(sDate.getTime())) {
          finalStatus = (sDate.getTime() > dDate.getTime()) ? "Late" : "Ahead/Ontime";
        }
      }
    }
  } else if (!hasSubmitted) {
    finalStatus = "Pending";
  }
  return finalStatus;
}

function isTrackingPeriod(text) {
  const t = text.trim().toUpperCase();
  const exactMatches = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER", "1ST QUARTER", "2ND QUARTER", "3RD QUARTER", "4TH QUARTER", "Q1", "Q2", "Q3", "Q4", "WEEKLY", "ONE-TIME", "ANNUAL", "SEMESTRAL"];
  if (exactMatches.includes(t)) return true;
  if (t.includes("ROUND") || t.includes("VISIT") || t.includes("MODULE") || t.includes("POPCEN") || t.includes("CBMS") || /^\d{4}\s/.test(t)) return true; 
  return false;
}

function getAdminHierarchy(taskName) {
  const t = taskName.trim().replace(/\s+/g, ' ').toUpperCase(); 
  if (t.includes("FRS DATABASE")) return { freq: "Monthly Reports", cat: "Financial Reports", rep: "FRS Database" };
  if (t.includes("AIS INHOUSE")) return { freq: "Monthly Reports", cat: "Financial Reports", rep: "AIS Inhouse" };
  if (t.includes("TRIAL BALANCE")) return { freq: "Monthly Reports", cat: "Financial Reports", rep: "Trial Balance" };
  if (t.includes("1601C")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "1601C" };
  if (t.includes("1601EQ")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "1601EQ" };
  if (t.includes("1601VT")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "1601VT" };
  if (t.includes("1601PT")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "1601PT" };
  if (t.includes("TAX REMITTANCE ADVICE") || t.includes("TAX REMITTANCE ADVISE")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "Tax Remittance Advice" };
  if (t.includes("LIQUIDATION REPORT")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "Liquidation Report" };
  if (t.includes("COLLECTIONS AND DEPOSIT")) return { freq: "Monthly Reports", cat: "Filing of Withholding Tax", rep: "Monthly Report of Collections and Deposit (RCD) on CRS Operation" };
  if (t.includes("PUNCTUALITY AND ATTENDANCE") || t.includes("SPA")) return { freq: "Monthly Reports", cat: "Human Resource", rep: "Monthly Summary Report on Punctuality and Attendance (SPA)" };
  if (t.includes("TRAINING EVALUATION")) return { freq: "Monthly Reports", cat: "Human Resource", rep: "Compliance and Submission of Training Evaluation - Level 3" };
  if (t.includes("ENERCON REPORTS")) return { freq: "Monthly Reports", cat: "Property and Supplies", rep: "Enercon Reports" };
  if (t.includes("FUEL REPORTS")) return { freq: "Monthly Reports", cat: "Property and Supplies", rep: "Fuel Reports" };
  if (t.includes("CIVIL REGISTRY INVENTORY REPORT")) return { freq: "Monthly Reports", cat: "Property and Supplies", rep: "Civil Registry Inventory Report" };
  if (t.includes("DISBURSEMENT VOUCHERS")) return { freq: "Monthly Reports", cat: "COA Submission", rep: "Disbursement Vouchers" };
  if (t.includes("REPORT OF CHECK ISSUED") || /\bRCI\b/.test(t)) { 
      if (t.includes("INVENTORIES")) return { freq: "Semestral Reports", cat: "Property and Supplies", rep: "Report on Physical Count of Inventories (RCI)" };
      return { freq: "Monthly Reports", cat: "COA Submission", rep: "Report of Check Issued (RCI)" };
  }
  if (t.includes("CHECKS ISSUED AND CANCELLED") || t.includes("SLCIC")) return { freq: "Monthly Reports", cat: "COA Submission", rep: "Summary List of Checks Issued and Cancelled (SLCIC)" };
  if (t.includes("CALL LOGS")) return { freq: "Monthly Reports", cat: "COA Submission", rep: "Call Logs (Soft Copy)" };
  if (t.includes("ACCOUNTABILITY FOR ACCOUNTABLE FORMS") || t.includes("RAAF")) return { freq: "Monthly Reports", cat: "COA Submission", rep: "Report of Accountability for Accountable Forms (RAAF)" };
  
  if (t.includes("FINANCIAL POSITION")) return { freq: "Quarterly Reports", cat: "Financial Reports", rep: "Statement of Financial Position" };
  if (t.includes("FINANCIAL PERFORMANCE")) return { freq: "Quarterly Reports", cat: "Financial Reports", rep: "Statement of Financial Performance" };
  if (t.includes("CHANGES IN EQUITY")) return { freq: "Quarterly Reports", cat: "Financial Reports", rep: "Statement of Changes in Equity" };
  if (t.includes("CASH FLOWS")) return { freq: "Quarterly Reports", cat: "Financial Reports", rep: "Statement of Cash Flows" };
  if (t.includes("GOVERNMENT PPA")) return { freq: "Quarterly Reports", cat: "COA Submission", rep: "Reports of Government PPA" };
  if (t.includes("SCHEDULE OF CASH ADVANCE") && !t.includes("UNLIQUIDATED")) return { freq: "Quarterly Reports", cat: "COA Submission", rep: "Schedule of Cash Advance" };
  
  if (t.includes("PERFORMANCE RATING") && (t.includes("1ST") || t.includes("1ST SEM"))) return { freq: "Semestral Reports", cat: "Financial Reports", rep: "Performance Rating (1st Semester)" };
  if (t.includes("PERFORMANCE RATING") && (t.includes("2ND") || t.includes("2ND SEM"))) return { freq: "Semestral Reports", cat: "Financial Reports", rep: "Performance Rating (2nd Semester)" };
  if (t.includes("UNLIQUIDATED FUND TRANSFER")) return { freq: "Semestral Reports", cat: "COA Submission", rep: "Schedule of Unliquidated Fund Transfer, Cash Advances and Receivables" };
  if (t.includes("MOOE AND CO")) return { freq: "Semestral Reports", cat: "COA Submission", rep: "Summary Reports of MOOE and CO provided to Audit Team" };
  if (t.includes("SEMI-EXPENDABLE") && (t.includes("RPCSP") || t.includes("CY 2025") || t.includes("SEMESTRAL"))) return { freq: "Semestral Reports", cat: "Property and Supplies", rep: "Report on Physical Count of Semi-Expendable Property (RPCSP)" };
  if (t.includes("SEMI-EXPENDABLE") && !t.includes("RPCSP")) return { freq: "Annual Reports", cat: "Property and Supplies", rep: "Report on Physical Count of Semi-Expendable Property" };

  if (t.includes("BIR 2316") || t === "2316") return { freq: "Annual Reports", cat: null, rep: "BIR 2316" }; 
  if (t.includes("FINANCIAL REPORTS AND SCHEDULE TO COA")) return { freq: "Annual Reports", cat: null, rep: "CY Financial Reports and Schedule to COA" };
  if (t.includes("GAD ACCOMPLISHMENTS")) return { freq: "Annual Reports", cat: "Gender and Development", rep: "GAD Accomplishments" };
  if (t.includes("GAD PLANS AND BUDGET")) return { freq: "Annual Reports", cat: "Gender and Development", rep: "GAD Plans and Budget" };
  if (t.includes("PERFORMANCE COMMITMENT") || t.includes("IPCR")) return { freq: "Annual Reports", cat: "Submission of Individual Performance Commitment Review (IPCR)", rep: "Performance Commitment / Target" };
  if (t.includes("PROPERTIES, PLANT AND EQUIPMENT") || t.includes("PLANT AND EQUIPMENT")) return { freq: "Annual Reports", cat: "Property and Supplies", rep: "Report on Physical Count of Properties, Plant and Equipment" };
  if (t.includes("ANNUAL PROCUREMENT PLAN") || t === "APP") return { freq: "Annual Reports", cat: "Property and Supplies", rep: "Annual Procurement Plan (APP)" };
  if (t.includes("OFFICE CLEARANCE")) return { freq: "Annual Reports", cat: "Property and Supplies", rep: "Office Clearance for Property Accountability" };
  return null;
}

function fetchReportData(config) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = ss.getSheetByName(config.sheetName);
  if (!targetSheet) return [];

  const lastRow = targetSheet.getLastRow();
  const lastCol = targetSheet.getLastColumn();
  if (lastRow < 1) return [];

  const rawData = targetSheet.getRange(1, 1, lastRow, lastCol).getValues();
  const normalizedRows = [];

  // FORCE ADMIN LOGIC if sheet is Admin, regardless of config typo
  const isAdminSheet = config.parserType === "ADMIN_HR" || config.sheetName.toUpperCase().includes("ADMIN");

  if (isAdminSheet) {
    const blocks = [];
    let currentBlock = {};

    if (rawData.length > 2) {
      const row3 = rawData[2];
      for (let c = 2; c < lastCol; c++) {
        const header = (row3[c] || "").toString().toUpperCase();
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
    for (let r = 0; r < lastRow; r++) {
      const row = rawData[r];
      const taskName = row[0] ? row[0].toString().trim() : "";
      if (!taskName) continue;
      
      const norm = taskName.replace(/\s+/g, ' ').toUpperCase();
      if (ADMIN_FREQUENCIES.includes(norm)) { currentFrequency = norm; continue; }
      if (ADMIN_CATEGORIES.includes(norm)) continue;
      if (r < config.dataStartRow - 1) continue;

      let hierarchy = getAdminHierarchy(taskName);
      if (!hierarchy) continue; 
      
      let reportGroup = hierarchy.cat ? `${hierarchy.freq} ➔ ${hierarchy.cat}` : hierarchy.freq;
      let metricTag = hierarchy.rep;
      const pic = row[1] ? row[1].toString().trim() : "N/A"; 

      let periodNames = [];
      if (currentFrequency.includes("MONTHLY")) periodNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      else if (currentFrequency.includes("QUARTERLY")) periodNames = ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];
      else if (currentFrequency.includes("SEMESTRAL")) periodNames = ["1st Semester", "2nd Semester"];
      else if (currentFrequency.includes("ANNUAL")) periodNames = ["Annual"];

      for (let i = 0; i < periodNames.length; i++) {
        if (!blocks[i]) continue; 
        
        let deadlineVal = row[blocks[i].deadline];
        let submittedVal = row[blocks[i].submitted];
        let statusVal = row[blocks[i].status];

        let deadlineStr = formatDateClean(deadlineVal);
        let submittedStr = formatDateClean(submittedVal);
        let finalStatus = getCalculatedStatus(statusVal, submittedVal, deadlineVal);

        normalizedRows.push([config.department, reportGroup, periodNames[i], metricTag, pic, submittedStr, deadlineStr, finalStatus, ""]);
      }
    }
  } else {
    // STATISTICAL DEFAULT PARSER
    let headerRowIndex = -1, metricGroupRowIndex = -1;
    for (let r = 0; r < 10 && r < rawData.length; r++) {
      for (let c = 0; c < rawData[r].length; c++) {
        let cellVal = rawData[r][c] ? rawData[r][c].toString().trim().toUpperCase() : "";
        if (cellVal.includes("STATUS") || cellVal.includes("DATE SUBMITTED") || cellVal.includes("DATE OF SUBMISSION")) {
          headerRowIndex = r; metricGroupRowIndex = r - 1; break;
        }
      }
      if (headerRowIndex !== -1) break;
    }

    if (headerRowIndex === -1) return []; 
    const headerRow = rawData[headerRowIndex];
    const metricGroupRow = metricGroupRowIndex >= 0 ? rawData[metricGroupRowIndex] : [];
    const statusColumns = [];
    let remarksColIndex = -1;

    for (let i = 1; i < lastCol; i++) {
      let colText = headerRow[i] ? headerRow[i].toString().trim().toUpperCase() : "";
      if (colText.includes("STATUS")) {
        let metricName = "General Data";
        for (let j = i; j >= 1; j--) { if (metricGroupRow[j] && metricGroupRow[j].toString().trim() !== "") { metricName = metricGroupRow[j].toString().trim(); break; } }
        let deadlineIndex = -1, submittedIndex = -1;
        // Check 2 columns to the left to capture both variants dynamically
        for (let offset = 1; offset <= 2; offset++) {
          if (i - offset >= 0) {
            let headerText = headerRow[i - offset] ? headerRow[i - offset].toString().trim().toUpperCase() : "";
            if (headerText.includes("DEADLINE")) deadlineIndex = i - offset;
            else if (headerText.includes("SUBMITTED") || headerText.includes("SUBMISSION")) submittedIndex = i - offset;
          }
        }
        statusColumns.push({ index: i, metricName: metricName, deadlineIndex: deadlineIndex, submittedIndex: submittedIndex });
      }
      if (colText.includes("REMARKS")) remarksColIndex = i;
    }

    const strictlyGeneralSheets = ["ID", "PHILSYS", "PL", "SPC"];
    if (strictlyGeneralSheets.includes(config.sheetName.toUpperCase()) && statusColumns.length > 0) {
      statusColumns.splice(1); 
      statusColumns[0].metricName = "General Data";
    }

    let currentTrackedMonth = "Annual/Ongoing", currentReportTitle = config.reportName, currentPIC = "N/A";
    for (let r = config.dataStartRow - 1; r < lastRow; r++) {
      const row = rawData[r];
      let rowColA = row[0] ? (row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), "MMMM") : row[0].toString().trim()) : "";
      if (rowColA.toUpperCase() === "STATISTICAL OPERATIONS" || rowColA.toUpperCase() === "CIVIL REGISTRATION ACTIVITIES" || rowColA.toUpperCase() === "MONTHLY ACTIVITIES") continue;

      if (rowColA !== "") {
          if (isTrackingPeriod(rowColA)) currentTrackedMonth = rowColA;
          else { currentReportTitle = rowColA; continue; }
      }

      const remarksVal = (remarksColIndex !== -1 && row[remarksColIndex]) ? row[remarksColIndex].toString().trim() : "";
      statusColumns.forEach(statusCol => {
        let deadlineValRaw = statusCol.deadlineIndex !== -1 ? row[statusCol.deadlineIndex] : null;
        let submittedValRaw = statusCol.submittedIndex !== -1 ? row[statusCol.submittedIndex] : null;
        let deadlineStr = formatDateClean(deadlineValRaw);
        let submittedStr = formatDateClean(submittedValRaw);
        
        if (rowColA === "" && deadlineStr === "" && submittedStr === "" && (!row[statusCol.index] || row[statusCol.index].toString().trim() === "")) return; 
        let finalStatus = getCalculatedStatus(row[statusCol.index], submittedValRaw, deadlineValRaw);
        normalizedRows.push([config.department, currentReportTitle, currentTrackedMonth, statusCol.metricName || "General Data", currentPIC, submittedStr, deadlineStr, finalStatus, remarksVal]);
      });
    }
  }
  return normalizedRows;
}