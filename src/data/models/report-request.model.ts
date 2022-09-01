import { Dayjs } from "dayjs";
import { ReportQuestion } from "./report-question.model";

export interface ReportRequest {
  id: string,
  client_id: string,
  report_type_id: number,
  report_request_schedule_id: string,
  date_created: string | Date | Dayjs,
  date_scheduled: string | Date | Dayjs,
  date_shown: string | Date | Dayjs,
  show_followups: number,
  person_id: string,
  version: string,
  date_updated: string | Date | Dayjs,
  date_deleted?: string,
  time?: number,
  next_schedule?: string | Date | Dayjs,
  remind_again_times: number,
  remind_again_minutes: number,
  remind_later: number,
  reminder_shown_times: number,
  report_question: ReportQuestion[];
}
