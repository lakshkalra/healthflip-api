import type { HealthReportRepository } from '../../db/repositories/health-report.repository.js';
import type { AiProvider } from '../../shared/ai/ai-provider.js';
import { notFound } from '../../shared/errors.js';
import type { ReportDraft } from '../../domain/reports.js';
import { guardReportOutput } from '../ai/ai.guardrails.js';
import { mapProviderError } from '../ai/ai.service.js';
import { serializeReport, serializeReportSummary } from './report.helper.js';
import type { ExtractReportInput } from './report.validator.js';

export function createReportService(reportRepository: HealthReportRepository, provider: AiProvider) {
  return {
    // Reads the pages and returns a draft to review. Nothing (not even the file) is stored here.
    async extract(input: ExtractReportInput): Promise<ReportDraft> {
      let output: unknown;
      try {
        output = await provider.extractReport(input.files);
      } catch (error) {
        throw mapProviderError(error);
      }
      try {
        return guardReportOutput(output);
      } catch (error) {
        if (error instanceof Error && 'statusCode' in error) throw error;
        throw mapProviderError(error);
      }
    },

    // The reviewed draft goes through the same safety screen before it is saved.
    async save(guestId: string, draft: ReportDraft) {
      const safe = guardReportOutput(draft);
      const { hydration: _hydration, ...report } = safe;
      return serializeReport(await reportRepository.create(guestId, report));
    },

    async list(guestId: string) {
      return (await reportRepository.list(guestId)).map(serializeReportSummary);
    },

    async get(guestId: string, id: string) {
      const report = await reportRepository.find(guestId, id);
      if (!report) throw notFound('Report');
      return serializeReport(report);
    },

    async delete(guestId: string, id: string) {
      if (!(await reportRepository.delete(guestId, id))) throw notFound('Report');
    },
  };
}
