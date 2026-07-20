/**
 * API.gs
 * Handles incoming web app GET requests.
 * Routes traffic to either the HTML UI or the JSON API.
 */
function doGet(e) {
  e = e || { parameter: {} }; 

  // 1. Trigger Manual Data Sync via the Frontend Button
  if (e.parameter.action === 'syncNow') {
    try {
      if (typeof runETLPipeline === "function") {
        runETLPipeline(); 
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Data synchronized successfully." }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // 2. Fetch Dashboard Data (Only triggers if explicitly requested by app.js)
  if (e.parameter.action === 'getData') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName("Dashboard_Data");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Dashboard_Data sheet not found." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // Lightweight mapping for faster JSON delivery
      const jsonData = data.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, i) => {
          let key = header.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
          let val = row[i];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "MM/dd/yyyy");
          }
          obj[key] = val;
        });
        return obj;
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true, data: jsonData }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Data read failed: " + error.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // 3. DEFAULT: Serve the HTML Website UI
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('PSA Monitoring Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Disables POST requests to prevent the web app from overwriting Excel data.
 */
function doPost(e) {
  return ContentService.createTextOutput(JSON.stringify({ 
    success: false, 
    error: "Write access disabled. The dashboard is in Read-Only mode." 
  })).setMimeType(ContentService.MimeType.JSON);
}