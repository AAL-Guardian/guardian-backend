import { Field } from "@aws-sdk/client-rds-data";
import { DATE_FORMAT, executeStatement, getOneBy, insertStatement, selectStatement, updateStatement } from "./dao";
import { Assignment } from "./models/assignment.model";
import { Client } from "./models/client.model";
import { Robot } from "./models/robot.model";
import dayjs = require("dayjs");
import { Person } from "./models/person.model";

export const getRobotByTopic = (robotTopic: string) => getOneBy<Robot>('robot', [
  {
    name: 'topic',
    value: {
      stringValue: robotTopic
    }
  }
]);

export async function getRobotBySN(serial_number: string): Promise<Robot | undefined> {
  // const all = await executeStatement("SELECT * FROM robot WHERE serial_number = :serial_number", [{
  const all = await selectStatement<Robot>("robot", [{
    name: 'serial_number',
    value: {
      stringValue: serial_number
    }
  }]);
  return all[0];
}

export async function insertRobot(serial_number: string, thing_name: string, topic: string, extra = null, is_active = true): Promise<boolean> {
  await insertStatement("robot", [
    {
      name: 'serial_number',
      value: {
        stringValue: serial_number
      }
    },
    {
      name: 'thing_name',
      value: {
        stringValue: thing_name
      }
    },
    {
      name: 'topic',
      value: {
        stringValue: topic
      }
    },
    {
      name: 'extra',
      value: {
        isNull: extra ? undefined : true,
        stringValue: extra ? extra : undefined,
      } as Field
    },
    {
      name: 'is_active',
      value: {
        booleanValue: is_active
      }
    }
  ])
  return true;
}

export async function getPersonByRobotSN(serial_number: string): Promise<Person> {
  const [ person ] = await executeStatement(`SELECT p.*
  FROM clients c
    JOIN robot_assignment ra on c.id = ra.clients_id
      JOIN persons p ON p.id = c.person_id
  WHERE ra.robot_serial_number = :serial_number
  AND ra.is_active = true
  AND current_timestamp BETWEEN ra.start_date AND IFNULL(ra.end_date, current_timestamp)`, [
    {
      name: 'serial_number',
      value: {
        stringValue: serial_number
      }
    }
  ]) as Person[];
  return person;
}

export async function getClientByRobotSN(serial_number: string): Promise<Client> {
  const clients = await executeStatement(`SELECT c.* FROM clients c
  JOIN robot_assignment ra on c.id = ra.clients_id
  WHERE ra.robot_serial_number = :serial_number
  AND ra.is_active = true
  AND current_timestamp BETWEEN ra.start_date AND IFNULL(ra.end_date, current_timestamp)`, [
    {
      name: 'serial_number',
      value: {
        stringValue: serial_number
      }
    }
  ]);
  return clients[0];
}

export async function assignRobot(serial_number: string, client_id: string, date_end?: string) {
  const currentAssignment = await getRobotAssignment(serial_number);
  if (currentAssignment) {
    if (client_id === currentAssignment.clients_id && date_end === currentAssignment.end_date) {
      return currentAssignment.id;
    }
    if (client_id === currentAssignment.clients_id && date_end !== currentAssignment.end_date) {
      //update
      return currentAssignment.id;
    }
    closeAssignment(currentAssignment.id);
    //close current assignment
  }
  const assignmentId = await createNewAssignment(serial_number, client_id, null, date_end);
  return assignmentId;
}

async function createNewAssignment(serial_number: string, clients_id: string, start_date: string | null, end_date: string | null): Promise<number> {
  const res = await insertStatement("robot_assignment", [
    {
      name: 'robot_serial_number',
      value: {
        stringValue: serial_number
      }
    },
    {
      name: 'clients_id',
      value: {
        stringValue: clients_id ?? undefined,
        isNull: !clients_id ? true : undefined
      } as Field
    },
    {
      name: 'start_date',
      value: {
        stringValue: start_date ?? dayjs().format(DATE_FORMAT)
      }
    },
    {
      name: 'end_date',
      value: {
        stringValue: end_date ?? '2099-12-31 23:59',
        // isNull: !end_date ? true : undefined // not nullable filed
      } as Field
    },
  ]);
  return res[0];
}

async function closeAssignment(id: number) {
  // await executeStatement(`UPDATE robot_assignment SET is_active = false, end_date = current_date WHERE id = :id`, [
  await updateStatement("robot_assignment", [
    {
      name: 'is_active',
      value: {
        booleanValue: false
      }
    },
    {
      name: 'end_date',
      value: {
        stringValue: dayjs().format(DATE_FORMAT)
      }
    },

  ],
    [
      {
        name: 'id',
        value: {
          longValue: id
        }
      }
    ],
  );
  return true;
}

export async function getRobotAssignment(robot_serial_number?: string, client_id?: string): Promise<Assignment> {
  if (!robot_serial_number && !client_id) {
    throw new Error('You must specify at lest one of robot_serial_number, client_id');
  }
  const assignment = await executeStatement(`
  SELECT *
  FROM robot_assignment
  WHERE robot_serial_number = ifnull(:serial_number, robot_serial_number)
    AND clients_id = ifnull(:client_id, clients_id)
    AND is_active = true
    AND current_timestamp BETWEEN start_date AND IFNULL(end_date, current_timestamp)`, [
    {
      name: 'serial_number',
      value: {
        stringValue: robot_serial_number ?? undefined,
        isNull: !robot_serial_number ? true : undefined
      } as Field
    },
    {
      name: 'client_id',
      value: {
        stringValue: client_id ?? undefined,
        isNull: !client_id ? true : undefined
      } as Field
    }
  ]);
  return assignment[0];
}

export async function getActiveAssignments() {
  const assignments = await executeStatement(`
  SELECT *
  FROM robot_assignment
  WHERE is_active = true
    AND current_timestamp BETWEEN start_date AND IFNULL(end_date, current_timestamp)`);
  return assignments as Assignment[];
}

export async function getRobotAssignmentById(assignmentId: number): Promise<Assignment> {
  const list = await selectStatement<Assignment>('robot_assignment', [{
    name: 'id',
    value: {
      longValue: assignmentId
    }
  }]);
  return list[0]
}

export async function getRobotCurrentLanguage(robotCode: string) {

}