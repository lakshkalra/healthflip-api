import type { HealthReportRecord } from '../../db/repositories/health-report.repository.js';

export function serializeReport(report: HealthReportRecord) {
  return {
    createdAt: report.createdAt.toISOString(),
    id: report.id,
    nutritionNotes: report.nutritionNotes,
    reportDate: report.reportDate,
    summary: report.summary,
    title: report.title,
    urgent: report.urgent,
    values: report.values,
  };
}

export function serializeReportSummary(report: HealthReportRecord) {
  return {
    createdAt: report.createdAt.toISOString(),
    flaggedCount: report.values.filter(value => value.flag === 'low' || value.flag === 'high' || value.flag === 'critical').length,
    id: report.id,
    reportDate: report.reportDate,
    title: report.title,
    urgent: report.urgent,
    valueCount: report.values.length,
  };
}
