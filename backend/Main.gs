/**
 * Main execution entry loop. Cleanly wipes data and loads normalized matrices.
 * Writes all config sheets in a single batched setValues() call to minimize API quota usage.
 */
function runETLPipeline() {
  try {
    console.log("[TRACE] Initiating pipeline...");
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Hardcoded to avoid Constants.gs dependency issues
    const dashboardSheet = ss.getSheetByName("Dashboard_Data");
    if (!dashboardSheet) {
      throw new Error("CRITICAL: Missing destination sheet named 'Dashboard_Data'");
    }

    // WIPE OLD DATA: Clear everything below Row 1 to prevent duplication
    console.log("[TRACE] Configurations loaded. Wiping old dashboard data...");
    const lastRow = dashboardSheet.getLastRow();
    if (lastRow > 1) {
      dashboardSheet.getRange(2, 1, lastRow - 1, dashboardSheet.getLastColumn()).clearContent();
      console.log("[RESET] Cleaned warehouse records for fresh run.");
    }

    const payload = buildDashboardPayload();
    const allRows = (payload.data || []).map(row => [
      row.Department || "",
      row.ReportName || "",
      row.Month || "",
      row.MetricType || "",
      row.PersonInCharge || "",
      row.Date_Submitted || "",
      row.Deadline || "",
      row.Status || "",
      row.Remarks || ""
    ]);

    // SINGLE BATCH WRITE — one Sheets API call for all sheets combined
    if (allRows.length > 0) {
      dashboardSheet.getRange(2, 1, allRows.length, allRows[0].length).setValues(allRows);
      console.log(`[LOAD COMPLETE] Successfully cataloged ${allRows.length} total rows.`);
    } else {
      console.log("[INFO] No data to write. Dashboard_Data remains empty.");
    }

    console.log("[PIPELINE COMPLETE] Database update finished.");
  } catch(e) {
    console.error("[CRITICAL V8 CRASH]", e.message, e.stack);
  }
}

/**
 * Developer Mode: Validates the ADMIN_HR parser against the live ADMINFRHR sheet.
 * Does NOT modify Dashboard_Data. Run from Apps Script editor to check hierarchy health.
 */
function validateAdminHierarchy() {
  console.log("[VALIDATION] Starting ADMIN_HR validation...");
  const configs = getActiveConfigurations();
  const adminConfig = configs.find(c => c.parserType === "ADMIN_HR");
  
  if (!adminConfig) {
    console.log("[VALIDATION FAIL] No active configuration found for ADMIN_HR.");
    return;
  }
  
  // Call the dedicated validation logic in Parser.gs
  validateAdminParser(adminConfig);
}