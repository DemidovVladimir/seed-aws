import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LambdaDestination } from 'aws-cdk-lib/aws-logs-destinations'
import { FilterPattern, SubscriptionFilter } from 'aws-cdk-lib/aws-logs'
import { IFunction } from 'aws-cdk-lib/aws-lambda'

export async function addLogsSubscription(
  scope: Construct,
  id: string,
  lambdaFunc: NodejsFunction,
  logsParserLambda: IFunction
) {
  // eslint-disable-next-line no-new
  new SubscriptionFilter(scope, `${id}Filter`, {
    destination: new LambdaDestination(logsParserLambda, {
      addPermissions: false,
    }),
    filterPattern: FilterPattern.exists('$.level'),
    logGroup: lambdaFunc.logGroup,
  })
}
