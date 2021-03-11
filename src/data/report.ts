import { executeStatement } from "./dao";

export async function getReportSetup(report_type_id: number) {
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
  const report_question = report_questions[0];
  report_question.report_question_options = await getQuestionOptions(report_question.id, true);
  return report_question;
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
  ]);
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
    ]);
  const question = questions[0];
  if (question && extended) {
    question.report_question_options = await getQuestionOptions(question.id, extended);
  }
  return question;
}