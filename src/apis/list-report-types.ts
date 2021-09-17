import { APIGatewayEvent } from "aws-lambda";
import { getResponseV2 } from "../common/response.template";
import { selectStatement } from "../data/dao";
import { ReportType } from "../data/models/report-type.model";
import { Translation } from "../data/models/translation.model";

export default async function (event: APIGatewayEvent) {
  const response = getResponseV2();

  const list = await selectStatement<ReportType>("report_type");
  const translations = await selectStatement<Translation>("translations", [{
    name: 'table_name',
    value: {
      stringValue: 'report_type'
    }
  }, {
    name: 'language',
    value: {
      stringValue: 'it'
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