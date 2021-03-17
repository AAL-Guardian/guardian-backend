import { ReportQuestion } from "./report-question.model";

export interface ReportType {
  id: number;
  name: string;
  description: string;
  sort_order: number;

  start_question?: ReportQuestion;
}
