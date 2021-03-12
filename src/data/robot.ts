import { Field } from "@aws-sdk/client-rds-data";
import { executeStatement } from "./dao";
import { Robot } from "./models/robot.model";

export async function getRobotBySN(serial_number: string): Promise<Robot | undefined> {
  const all = executeStatement("SELECT * FROM robot WHERE serial_number = :serial_number", [{
    name: 'serial_number',
    value: {
      stringValue: serial_number
    }
  }]);
  return all[0];
}

export async function insertRobot(serial_number: string, thing_name: string, topic: string, extra = null, active = true): Promise<boolean> {
  await executeStatement("INSERT INTO robot (serial_number, thing_name, topic, extra, active) VALUES (:serial_number, :thing_name, :topic, :extra, :active)", [
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
      name: 'active',
      value: {
        booleanValue: active
      }
    }
  ])
  return true;
}

export async function getRobotByClientId(robotId: string) {
  const robot = executeStatement(`SELECT * FROM`)
}

export async function getClientByRobotSN(serial_number: string) {

}