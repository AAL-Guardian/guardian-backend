import { APIGatewayProxyEvent } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { executeStatement } from "../data/dao";

export default async function (event: APIGatewayProxyEvent) {

  const refreshReportTypeTr = `insert into translations (\`table_name\`, \`column_name\`,  \`item_id\`, \`language\`, \`translation\`)
SELECT 'report_type', 'description', id as item_id, 'en', description from report_type
ON DUPLICATE KEY UPDATE translation = guardian.report_type.description`;

const refreshReportQuestionTr = `insert into translations (\`table_name\`, \`column_name\`,  \`item_id\`, \`language\`, \`translation\`)
SELECT 'report_question', 'description', id as item_id, 'en', description from report_question
ON DUPLICATE KEY UPDATE translation = report_question.description`;

const refreshReportQuestionOptTr = `insert into translations (\`table_name\`, \`column_name\`,  \`item_id\`, \`language\`, \`translation\`)
SELECT 'report_question_option', 'description', id as item_id, 'en', description from report_question_option
ON DUPLICATE KEY UPDATE translation = report_question_option.description`;

  await executeStatement(refreshReportTypeTr);
  await executeStatement(refreshReportQuestionTr);
  await executeStatement(refreshReportQuestionOptTr);

  return getResponse({ statusCode: 204 });
}