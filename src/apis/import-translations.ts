import { APIGatewayProxyEventV2 } from "aws-lambda";
import { getResponse } from "../common/response.template";
import { insertStatement, selectStatement, updateStatement } from "../data/dao";
import { Translation } from "../data/models/translation.model";

export default async function (event: APIGatewayProxyEventV2) {
  const response = getResponse();
  const { lang } = event.pathParameters;
  const translations = JSON.parse(event.body) as {
    table_name: {
      column_name: {
        [item_id: string]: string
      }
    }
  };

  const existingTranslations = await selectStatement<Translation>('translations', [{
    name: 'language',
    value: {
      stringValue: lang
    }
  }]);

  for (const table_name in translations) {
    for (const column_name in translations[table_name]) {
      for (const item_id in translations[table_name][column_name]) {
        const existing = existingTranslations
          .find(one => one.table_name === table_name && one.column_name === column_name && one.item_id === parseInt(item_id))
        if (existing) {
          await updateStatement(
            'translations',
            [{ name: 'translation', value: { stringValue: translations[table_name][column_name][item_id] } }],
            [{ name: 'id', value: { longValue: existing.id } }]
          );
        } else {
          await insertStatement('translations', [
            { name: 'table_name', value: { stringValue: table_name } },
            { name: 'column_name', value: { stringValue: column_name } },
            { name: 'item_id', value: { longValue: parseInt(item_id) } },
            { name: 'language', value: { stringValue: lang } },
            { name: 'translation', value: { stringValue: translations[table_name][column_name][item_id] } },
          ]);
        }
      }
    }
  }
  response.statusCode = 204;
  return response;
}