import { Duration } from 'aws-cdk-lib'
import {
  IAuthorizer,
  IRestApi,
  LambdaIntegration,
  Resource,
} from 'aws-cdk-lib/aws-apigateway'
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { Construct } from 'constructs'
import { addAlertingOnErrors } from './alerting'
import { defaultPreflightOptions } from './cors'
import { addLogsSubscription } from './logging'

export interface IRestEndpointProps {
  api: IRestApi
  entry: string
  path: string
  httpMethod: string
  timeout?: Duration
  environment?: Record<string, string>
  authorizer?: IAuthorizer
  memorySize?: number
  alarmsTopic: Topic
  logsParserLambda: IFunction
}

export class RestEndpoint extends Construct {
  public readonly handler: NodejsFunction
  public readonly resource: Resource

  constructor(scope: Construct, id: string, props: IRestEndpointProps) {
    super(scope, id)

    if (!props.environment) {
      props.environment = {}
    }
    props.environment.POWERTOOLS_SERVICE_NAME = id
    props.environment.NODE_OPTIONS = '--enable-source-maps'

    const handler = (this.handler = new NodejsFunction(this, `${id}Handler`, {
      runtime: Runtime.NODEJS_16_X,
      entry: props.entry,
      awsSdkConnectionReuse: true,
      handler: 'handler',
      timeout: props.timeout || Duration.seconds(5),
      environment: props.environment,
      bundling: {
        sourceMap: true,
        sourceMapMode: SourceMapMode.DEFAULT,
      },
      memorySize: props.memorySize || 1024,
    }))

    const resource = (this.resource = props.api.root.resourceForPath(
      props.path
    ))

    resource.addCorsPreflight(defaultPreflightOptions)

    resource.addMethod(props.httpMethod, new LambdaIntegration(handler), {
      authorizer: props.authorizer,
    })
    addAlertingOnErrors(this, `${id}Lambda`, handler, props.alarmsTopic)
    addLogsSubscription(this, `${id}Lambda`, handler, props.logsParserLambda)
  }
}
