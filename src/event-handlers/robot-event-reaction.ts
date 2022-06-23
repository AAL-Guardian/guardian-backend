import { getRobotByTopic } from '../data/robot';
import { handleRobotInteraction } from '../logic/guardian-event-logic';

export default async function(event: {
  robot_topic: string,
  data: any
}) {
  if(event.data?.skill === 'sense_touch') {
    const robot = await getRobotByTopic(event.robot_topic);
    if(event.data.message === 'touch detected') {
      await handleRobotInteraction(robot, event.data);
    }
  }
}