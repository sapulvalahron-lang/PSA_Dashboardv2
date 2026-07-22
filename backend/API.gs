/**
 * API.gs
 * Headless PSA Web App API.
 */
function serializeValueText(value) {
  if (value === null) return "null";
  if (value === undefined) return "null";

  const kindTag = Object.prototype.toString.call(value);
  if (kindTag === "[object Number]" || kindTag === "[object Boolean]") return String(value);
  if (kindTag === "[object String]") return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';

  if (Array.isArray(value)) {
    return "[" + value.map(serializeValueText).join(",") + "]";
  }

  const keys = Object.keys(value);
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    parts.push(serializeValueText(key) + ":" + serializeValueText(value[key]));
  }
  return "{" + parts.join(",") + "}";
}

function doGet(e) {
  e = e || { parameter: {} }; 

  if (e.parameter.action === 'syncNow') {
    try {
      runETLPipeline();
      return ContentService.createTextOutput(serializeValueText({ success: true, message: "Data synchronized successfully." })).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(serializeValueText({ success: false, error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  if (e.parameter.action === 'getData') {
    try {
      const payload = buildDashboardPayload();
      return ContentService.createTextOutput(serializeValueText(payload)).setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(serializeValueText({ success: false, error: "Data read failed: " + error.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (e.parameter.action === 'downloadTemplate') {
    try {
      const csv = handleCsvDownloadTemplate();
      return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.TEXT);
    } catch (error) {
      return ContentService.createTextOutput(serializeValueText({ success: false, error: "Template generation failed: " + error.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(serializeValueText({ status: "PSA API is running natively" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawContent = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : "";
    
    if (rawContent.trim().startsWith("{")) {
      const payload = JSON.parse(rawContent);
      
      if (payload.action === "updateRecordDirect") {
        const result = handleSingleRecordUpdateDirect(payload.data);
        return ContentService.createTextOutput(serializeValueText(result)).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (payload.action === "updateRecord") {
        const result = handleSingleRecordUpdate(payload.data);
        return ContentService.createTextOutput(serializeValueText(result)).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const result = handleCsvUpload(e);
    return ContentService.createTextOutput(serializeValueText(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(serializeValueText({
      updated: 0, skipped: 0, errors: ["Server Error: " + error.message]
    })).setMimeType(ContentService.MimeType.JSON);
  }
}