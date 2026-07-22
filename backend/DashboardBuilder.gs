/**
 * DashboardBuilder.gs
 * Converts hierarchy records into the dashboard payload consumed by the frontend.
 */

function dashboardStatusFromValues(submittedVal, deadlineVal) {
  const submittedText = hierarchyNormalizeText(submittedVal);
  const deadlineText = hierarchyNormalizeText(deadlineVal);

  const hasSubmitted = submittedText !== "";
  const hasDeadline = deadlineText !== "";

  if (!hasSubmitted && !hasDeadline) return "Pending";

  if (hasDeadline) {
    const deadlineDate = new Date(deadlineText);
    if (!isNaN(deadlineDate.getTime())) {
      const today = new Date();
      deadlineDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (!hasSubmitted) {
        return today.getTime() > deadlineDate.getTime() ? "Overdue" : "Pending";
      }

      const submittedDate = new Date(submittedText);
      if (!isNaN(submittedDate.getTime())) {
        submittedDate.setHours(0, 0, 0, 0);
        return submittedDate.getTime() > deadlineDate.getTime() ? "Late" : "Ahead";
      }
    }
  }

  if (hasSubmitted) return "Ahead";
  return hasDeadline ? "Pending" : "Pending";
}

function dashboardFormatReportTitle(key) {
  const frequency = hierarchyToTitleCase(key.frequency);
  const category = hierarchyToTitleCase(key.category);
  return category ? `${frequency} ➔ ${category}` : frequency;
}

function buildDashboardPayload() {
  const hierarchyEntries = extractHierarchy();
  const dashboardRows = [];

  for (const entry of hierarchyEntries) {
    const status = dashboardStatusFromValues(entry.values.submitted, entry.values.deadline);
    dashboardRows.push({
      Department: "",
      ReportName: dashboardFormatReportTitle(entry.key),
      Month: hierarchyNormalizeText(entry.key.period),
      MetricType: hierarchyNormalizeText(entry.key.task),
      PersonInCharge: hierarchyNormalizeText(entry.values.personInCharge) || "N/A",
      Date_Submitted: hierarchyNormalizeText(entry.values.submitted),
      Deadline: hierarchyNormalizeText(entry.values.deadline),
      Status: status,
      Remarks: hierarchyNormalizeText(entry.values.remarks),
      Sheet: hierarchyNormalizeText(entry.location.sheet),
      Row: entry.location.row,
      DateColumn: entry.location.dateColumn,
      DeadlineColumn: entry.location.deadlineColumn,
      Frequency: hierarchyNormalizeText(entry.key.frequency),
      Category: hierarchyNormalizeText(entry.key.category),
      Task: hierarchyNormalizeText(entry.key.task),
      Period: hierarchyNormalizeText(entry.key.period)
    });
  }

  return {
    success: true,
    data: dashboardRows
  };
}
