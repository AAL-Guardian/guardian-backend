import { Field } from "@aws-sdk/client-rds-data";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { getResponseV2 } from "../common/response.template";
import { executeStatement } from "../data/dao";

export default async function (event: APIGatewayProxyEventV2) {
  const response = getResponseV2();
  const report_type_id = event.pathParameters.id
  let report_questions = await executeStatement(
    `SELECT rq.*
      FROM report_question rq
        LEFT JOIN report_question_followup rqf on rq.id = rqf.followup_question_id
      WHERE rq.report_type_id = :report_type_id
      AND ( rqf.id is null OR rqf.report_question_option_id IS NULL )
      ORDER BY sort_order;`,
    [
      {
        name: 'report_type_id',
        value: {
          longValue: parseInt(report_type_id)
        }
      }
    ]);
  report_questions = await Promise.all(report_questions.map(async question => {
    question.report_question_options = await executeStatement(
      `SELECT *
      FROM report_question_option
      WHERE report_question_id = :report_question_id
      ORDER BY sort_order;`, [
        {
          name: 'report_question_id',
          value: {
            longValue: question.id
          }
        }
      ]
    );
    return question;
  }))
  response.body = JSON.stringify(report_questions);
  return response;
}