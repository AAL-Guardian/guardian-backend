import { APIGatewayEvent } from "aws-lambda";
import { Person } from "../data/models/person.model";
import { getResponse } from "../common/response.template";
import { selectStatement } from "../data/dao";
import { ReportType } from "../data/models/report-type.model";
import { Translation } from "../data/models/translation.model";

export default async function (event: APIGatewayEvent) {
  const response = getResponse();

  const [ person ] = await selectStatement<Person>('persons', [{
    name: 'id',
    value: {
      stringValue: event.requestContext.authorizer.personId
    }
  }]);
  const list = await selectStatement<ReportType>("report_type");
  const translations = await selectStatement<Translation>("translations", [{
    name: 'table_name',
    value: {
      stringValue: 'report_type'
    }
  }, {
    name: 'language',
    value: {
      stringValue: person.language
    }
  }]);

  response.body = JSON.stringify(
    list.map(one => {
      translations
        .filter(tr => tr.item_id === one.id)
        .forEach(tr => {
          one[tr.column_name] = tr.translation
        })
      return one;
    })
  );

  return response;
}