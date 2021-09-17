import { SimpleObject } from "./models/anymodel";
import { Translation } from "./models/translation.model";

export function translate<T extends { id: any }>(object: T, table_name: string, translations: Translation[]): T {
  translations
    .filter(tr => tr.table_name === table_name && tr.item_id === object.id)
    .forEach(tr => {
      object[tr.column_name] = tr.translation
    });
  return object;
}