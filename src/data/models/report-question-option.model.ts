import { ReportQuestion } from "./report-question.model";

export interface ReportQuestionOption {
  id: number;
  report_question_id: number;
  name: string;
  description: string;
  sort_order: number;

  followup_question?: ReportQuestion;
}