// import { Connection, ConnectionConfig, createConnection } from 'mysql';
// import { SqlParameter, ExecuteStatementResponse } from '@aws-sdk/client-rds-data';

// let connection: Connection;
// export async function executeStatement(sql: string, parameters: SqlParameter[] = []): Promise<ExecuteStatementResponse> {
//   if (!connection) {
//     connection = createConnection({
//       host: 'localhost',
//       port: 3306,
//       database: 'guardian',
//       user: 'admin',
//       password: 'guardian'
//     } as ConnectionConfig);

//     connection.config.queryFormat = (query, values: SqlParameter[]) => {
//       if (!values || values.length === 0) return query;
//       query = query.replace(/\:(\w+)/g, (txt, key) => {
//         const value = values.find(one => one.name === key);
//         if (value) {
//           return connection.escape(Object.values(value.value)[0]);
//         }
//         return txt;
//       });
//       console.log(query);
//       return query;
//     };
//   }

//   // const values: { [keys: string]: any } = {};
//   // for(let one of parameters) {
//   //   values[one.name] = one.value;
//   // }
//   return new Promise((resolve, reject) => {
//     connection.query(
//       sql,
//       parameters,
//       (err, res, fields) => {
//         if (err) {
//           reject(err)
//         } else {
//           /** mapping per emulare RDS Data Service */
//           resolve({
//             numberOfRecordsUpdated: res.hasOwnProperty('affectedRows') ? res.affectedRows : 0,
//             generatedFields: res.insertId ? [
//               {
//                 longValue: res.insertId
//               }
//             ] : undefined,
//             columnMetadata: fields,
//             records: !res.hasOwnProperty('affectedRows') ? res.map(one => Object.values(one).map(raw => ({
//               StringValue: raw
//             }))) : undefined
//           });
//         }
//       }
//     )
//   })
// }