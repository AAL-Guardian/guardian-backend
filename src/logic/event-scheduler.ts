import { CloudWatchEventsClient, DescribeRuleCommand, ListRulesCommand, PutRuleCommand, Rule } from "@aws-sdk/client-cloudwatch-events";
import { listFutureReportRequests } from "../data/schedule";
import dayjs = require("dayjs");

const cloudWatchEvents = new CloudWatchEventsClient({
  region: 'eu-west-1'
});

export async function scheduleNextEvent(ruleName?: string) {
  try {
    let rule: Rule;
    if(!ruleName) {
      const res = await cloudWatchEvents.send(new ListRulesCommand({
        EventBusName: 'default',
        NamePrefix: `guardian-backend-${process.env.stage}-ElaborateScheduler`
      }));
      rule = res.Rules[0];
    } else {
      rule = await cloudWatchEvents.send(new DescribeRuleCommand({
        EventBusName: 'default',
        Name: ruleName
      }));
    }
  
    const nextRequests = await listFutureReportRequests();
    
    let schedule = "cron(* * * * * *)";
    const fistScheduled = nextRequests[0];
    console.log('next scheduled', fistScheduled);
  
    if(fistScheduled) {
      const nextDate = dayjs(fistScheduled.date_scheduled);
      schedule = `cron(${nextDate.format('mm HH DD MM ? YYYY')})`
    }
    if(rule.ScheduleExpression !== schedule) {
      console.log(`changing expression from ${rule.ScheduleExpression} to ${schedule}`);
      await cloudWatchEvents.send(new PutRuleCommand({
        Name: rule.Name,
        ScheduleExpression: schedule,
      }));
    } else {
      console.log('wont change expression');
    }
  } catch(e) {
    console.log('Could not set new event');
    console.log(e);
  }
}
