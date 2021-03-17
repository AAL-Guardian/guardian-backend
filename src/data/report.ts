import { executeStatement, selectStatement } from "./dao";
import { ReportQuestionOption } from "./models/report-question-option.model";
import { ReportQuestion } from "./models/report-question.model";
import { ReportType } from "./models/report-type.model";

export async function getReportSetup(report_type_id: number) {
  const report_types = await selectStatement('report_type', [{
    name: 'id',
    value: { longValue: report_type_id }
  }]) as ReportType;
  const report_type = report_types[0];
  const report_questions = await executeStatement(
    `SELECT rq.*
      FROM report_question rq
        LEFT JOIN report_question_followup rqf on rq.id = rqf.followup_question_id
      WHERE rq.report_type_id = :report_type_id 
      ORDER BY sort_order;`,
    [
      {
        name: 'report_type_id',
        value: {
          longValue: report_type_id
        }
      }
    ]);
  report_type.start_question = report_questions[0];
  report_type.start_question.options = await getQuestionOptions(report_type.start_question.id, true);
  return report_type;
}

export async function getQuestionOptions(report_question_id: number, extended = true) {
  let options = await executeStatement(
    `SELECT *
      FROM report_question_option
      WHERE report_question_id = :report_question_id
      ORDER BY sort_order;`, [
    {
      name: 'report_question_id',
      value: {
        longValue: report_question_id
      }
    }
  ]) as ReportQuestionOption[];
  if (extended) {
    options = await Promise.all(options.map(async option => {
      option.followup_question = await getOptionFollowUp(option.id, report_question_id, extended)
      return option;
    }));
  }

  return options;
}

export async function getOptionFollowUp(report_question_option_id: number, report_question_id: number, extended = true) {
  const questions = await executeStatement(
    `SELECT DISTINCT rq.*
      FROM report_question rq 
        JOIN report_question_followup rqf on rq.id = rqf.followup_question_id
      WHERE report_question_id = :report_question_id
        AND (report_question_option_id is null OR report_question_option_id = :report_question_option_id)`,
    [
      {
        name: 'report_question_id',
        value: {
          longValue: report_question_id
        }
      },
      {
        name: 'report_question_option_id',
        value: {
          longValue: report_question_option_id
        }
      }
    ]) as ReportQuestion[];
  const question = questions[0];
  if (question && extended) {
    question.options = await getQuestionOptions(question.id, extended);
  }
  return question;
}