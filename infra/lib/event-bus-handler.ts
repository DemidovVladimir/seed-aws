import { Duration } from 'aws-cdk-lib'
import { EventPattern, IEventBus, Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Construct } from 'constructs'
import { addAlertingOnErrors } from './alerting'
import { addLogsSubscription } from './logging'

export interface IEventBusHandlerProps {
  entry: string
  timeout?: Duration
  memorySize?: number
  environment?: Record<string, string>
  eventBus: IEventBus
  eventPattern: EventPattern
  alarmsTopic: Topic
  logsParserLambda: IFunction
}

export class EventBusHandler extends Construct {
  public readonly handler: NodejsFunction
  public readonly rule: Rule

  constructor(scope: Construct, id: string, props: IEventBusHandlerProps) {
    super(scope, id)

    if (!props.environment) {
      props.environment = {}
    }
    props.environment.POWERTOOLS_SERVICE_NAME = id
    props.environment.NODE_OPTIONS = '--enable-source-maps'

    const handler = (this.handler = new NodejsFunction(this, `${id}Lambda`, {
      runtime: Runtime.NODEJS_16_X,
      entry: props.entry,
      awsSdkConnectionReuse: true,
      handler: 'handler',
      bundling: {
        sourceMap: true,
        sourceMapMode: SourceMapMode.DEFAULT,
      },
      timeout: props.timeout || Duration.seconds(5),
      memorySize: props.memorySize || 1024,
      environment: props.environment,
    }))

    const rule = (this.rule = new Rule(this, `${id}Rule`, {
      eventBus: props.eventBus,
      eventPattern: props.eventPattern,
    }))

    rule.addTarget(new LambdaFunction(handler))
    addAlertingOnErrors(this, `${id}Lambda`, handler, props.alarmsTopic)
    addLogsSubscription(this, `${id}Lambda`, handler, props.logsParserLambda)
  }
}
