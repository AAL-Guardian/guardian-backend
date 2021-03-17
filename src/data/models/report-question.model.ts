import { ReportQuestionOption } from "./report-question-option.model";

export interface ReportQuestion {
  id: number;
  report_type_id: number;
  name: string;
  description: string;
  sort_order: number;
  multiple_answers: number;

  options?: ReportQuestionOption[];
}
