/**
 * Reads the _Config sheet and returns active configurations.
 */
function getActiveConfigurations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Hardcoded to avoid Constants.gs dependency issues
  const configSheet = ss.getSheetByName("_Config");
  
  if (!configSheet) {
    throw new Error("CRITICAL: Missing configuration sheet named '_Config'");
  }
  console.log("[TRACE] Config sheet successfully accessed.");

  const rawData = configSheet.getDataRange().getValues();
  rawData.shift(); // Remove the header row
  
  const activeConfigs = [];

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const isEnabled = row[1]; // Column B

    if (isEnabled === true) {
      activeConfigs.push({
        configId: row[0],         // Column A
        department: row[2],       // Column C (GRABS THE DEPARTMENT)
        reportName: row[4],       // Column E (GRABS THE SPECIFIC TITLE)
        sheetName: row[5],        // Column F
        parserType: row[6],       // Column G
        headerRow: row[8],        // Column I
        dataStartRow: row[9]      // Column J
      });
    }
  }

  console.log("[TRACE] Successfully mapped " + activeConfigs.length + " active configurations.");
  return activeConfigs;
}