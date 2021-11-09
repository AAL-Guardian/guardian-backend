import dayjs = require("dayjs");
import { v4 } from "uuid";
import { DATETIME_FORMAT, executeStatement, insertStatement, selectStatement, updateStatement } from "./dao";
import { ReportQuestionOption } from "./models/report-question-option.model";
import { ReportQuestion } from "./models/report-question.model";
import { ReportRequest } from "./models/report-request.model";
import { ReportType } from "./models/report-type.model";
import { Client } from "./models/client.model";

export async function getReportSetup(report_type_id: number): Promise<ReportType> {
  const [report_type] = await selectStatement<ReportType>('report_type', [{
    name: 'id',
    value: { longValue: report_type_id }
  }]);

  const [report_question] = await executeStatement(
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
    ]) as ReportQuestion[];
  if (report_question) {
    report_type.start_question = report_question;
    report_type.start_question.options = await getQuestionOptions(report_type.start_question.id, true);
  }
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

export async function setShowDate(report_request: ReportRequest) {
  await updateStatement('report_request',
    [
      {
        name: 'date_shown',
        value: {
          stringValue: dayjs().format(DATETIME_FORMAT)
        }
      }
    ],
    [
      {
        name: 'id',
        value: {
          stringValue: report_request.id
        }
      }
    ]
  )
}

export async function insertAnswer(
  client_id: string,
  report_type_id: number,
  report_request_id: string,
  person_id: string
) {
  const report_answer_id = v4();
  await insertStatement('report_answer', [
    {
      name: 'id',
      value: {
        stringValue: report_answer_id
      }
    },
    {
      name: 'client_id',
      value: {
        stringValue: client_id
      }
    },
    {
      name: 'report_type_id',
      value: {
        longValue: report_type_id
      }
    },
    {
      name: 'report_request_id',
      value: {
        stringValue: report_request_id
      }
    },
    {
      name: 'date_created',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
    {
      name: 'person_id',
      value: {
        stringValue: person_id
      }
    },
    {
      name: 'version',
      value: {
        longValue: 0
      }
    },
    {
      name: 'date_updated',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
  ]);
  return report_answer_id;
}

export async function insertAnswerQuestion(report_answer_id: string, report_question_id: number) {
  const id = await insertStatement('report_answer_question', [
    {
      name: 'report_answer_id',
      value: {
        stringValue: report_answer_id
      }
    },
    {
      name: 'report_question_id',
      value: {
        longValue: report_question_id
      }
    },
    {
      name: 'date_created',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
  ]);
  console.log('insert report_answer_question', id);
  return id[0];
}

export async function insertAnswerQuestionOption(report_answer_question_id: number, report_question_option_id: number) {
  const id = await insertStatement('report_answer_question_option', [
    {
      name: 'report_answer_question_id',
      value: {
        longValue: report_answer_question_id
      }
    },
    {
      name: 'report_question_option_id',
      value: {
        longValue: report_question_option_id
      }
    }
  ]);
  return id[0];
}

export async function elaborateQuestionAnswer(question: ReportQuestion, answerId: string) {
  const id = await insertAnswerQuestion(answerId, question.id);
  await Promise.all(
    question.options.filter(option => option.selected).map(
      async selectedOption => {
        await insertAnswerQuestionOption(id, selectedOption.id)
        if (selectedOption.followup_question?.options?.some(one => one.selected)) {
          await elaborateQuestionAnswer(selectedOption.followup_question, answerId);
        }
      }
    )
  );
}

export async function insertSelfReportRequest(client_id: string, report_type_id: number) {
  const [client] = await selectStatement('clients', [
    {
      name: 'id',
      value: {
        stringValue: client_id
      }
    }
  ]) as Client[];
  const id = v4();
  await insertStatement('report_request', [
    {
      name: 'id',
      value: {
        stringValue: id
      }
    },
    {
      name: 'client_id',
      value: {
        stringValue: client_id
      }
    },
    {
      name: 'report_type_id',
      value: {
        longValue: report_type_id
      }
    },
    {
      name: 'person_id',
      value: {
        stringValue: client.person_id
      }
    },
    {
      name: 'date_created',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
    {
      name: 'date_scheduled',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
    {
      name: 'date_shown',
      value: {
        stringValue: dayjs().format(DATETIME_FORMAT)
      }
    },
    {
      name: 'show_followups',
      value: {
        longValue: 1
      }
    },
    {
      name: 'version',
      value: {
        longValue: 0
      }
    }
  ]);
  const [reportRequest] = await selectStatement('report_request', [
    {
      name: 'id',
      value: {
        stringValue: id
      }
    }
  ]) as ReportRequest[];
  return reportRequest;
}