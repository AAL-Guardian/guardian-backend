import { APIGatewayProxyEventV2 } from "aws-lambda";
import { selectStatement } from "../data/dao";
import { getResponseV2 } from "../common/response.template";
import { getReportSetup } from "../data/report";
import { translate } from "../data/translation";
import { Translation } from "../data/models/translation.model";
import { ReportQuestion } from "../data/models/report-question.model";

export default async function (event: APIGatewayProxyEventV2) {
  const response = getResponseV2();
  const report_type_id = event.pathParameters.id

  const reportType = await getReportSetup(parseInt(report_type_id));
  const translations = await selectStatement<Translation>('translations', [{
    name: 'language',
    value: {
      stringValue: 'it'
    }
  }]);
  const translatedReportType = translate(reportType, 'report_type', translations);
  translatedReportType.start_question = translateQuestion(translatedReportType.start_question, translations);

  response.body = JSON.stringify(translatedReportType);
  return response;
}

function translateQuestion(question: ReportQuestion, translations: Translation[]): ReportQuestion {
  question = translate(question, 'report_question', translations);
  question.options = question.options.map(
    option => {
      option = translate(option, 'report_question_option', translations);
      if(option.followup_question) {
        option.followup_question = translateQuestion(option.followup_question, translations);
      }
      return option
    }
  );
  return question;
}