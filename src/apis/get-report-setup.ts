import { APIGatewayProxyEventBase } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { selectStatement } from "../data/dao";
import { AuthContext } from "../data/models/auth";
import { Person } from "../data/models/person.model";
import { ReportQuestion } from "../data/models/report-question.model";
import { Translation } from "../data/models/translation.model";
import { getReportSetup } from "../data/report";
import { translate } from "../data/translation";

export default async function (event: APIGatewayProxyEventBase<AuthContext>) {
  const response = getResponse();
  const report_type_id = event.pathParameters.id
  
  const [ person ] = await selectStatement<Person>('persons', [{
    name: 'id',
    value: {
      stringValue: event.requestContext.authorizer.personId
    }
  }]);
  const reportType = await getReportSetup(parseInt(report_type_id));
  const translations = await selectStatement<Translation>('translations', [{
    name: 'language',
    value: {
      stringValue: person.language
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