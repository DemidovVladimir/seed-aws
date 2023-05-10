import { Topic } from 'aws-cdk-lib/aws-sns'
import { Duration } from 'aws-cdk-lib'
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch'
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions'
import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

export async function addAlertingOnErrors(
  scope: Construct,
  id: string,
  lambdaFunc: NodejsFunction,
  alarmsTopic: Topic
) {
  const functionErrors = lambdaFunc.metricErrors({
    period: Duration.minutes(1),
  })

  const alarm = new Alarm(scope, `${id}Alarm`, {
    metric: functionErrors,
    threshold: 1,
    comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    evaluationPeriods: 1,
    alarmDescription:
      'Alarm if the SUM of Errors is greater than or equal to the threshold (1) for 1 evaluation period',
  })

  alarm.addAlarmAction(new SnsAction(alarmsTopic))
}
