import { APIGatewayProxyEventV2 } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { selectStatement } from "../data/dao";
import { Translation } from "../data/models/translation.model";

export default async function (event: APIGatewayProxyEventV2) {
  const response = getResponse();
  const { lang } = event.pathParameters;
  const translations = await selectStatement<Translation>('translations', [{
    name: 'language',
    value: {
      stringValue: lang
    }
  }]);

  response.body = JSON.stringify(
    translations.reduce((acc, one) => {
      if(!acc[one.table_name]) {
        acc[one.table_name] = {}
      }
      if(!acc[one.table_name][one.column_name]) {
        acc[one.table_name][one.column_name] = {}
      }
      acc[one.table_name][one.column_name][one.item_id] = one.translation
      return acc;
    }, {} as { [key: number]: string })
  );
  
  return response;
}