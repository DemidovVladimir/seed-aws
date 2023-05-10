import { Construct } from 'constructs'
import { Fn, Stack, StackProps, Tags } from 'aws-cdk-lib'
import { CfnDeployment, Deployment, RestApi } from 'aws-cdk-lib/aws-apigateway'
import {
  AttributeType,
  BillingMode,
  StreamViewType,
  Table,
} from 'aws-cdk-lib/aws-dynamodb'
import { EventBus } from 'aws-cdk-lib/aws-events'
import { RewardService } from './service'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { DynamodbS3Backup } from './dynamodb-s3-backup'
import { Topic, Subscription, SubscriptionProtocol } from 'aws-cdk-lib/aws-sns'
import { Function } from 'aws-cdk-lib/aws-lambda'
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets'
import { Queue } from 'aws-cdk-lib/aws-sqs'

export interface IRewardServiceStackProps extends StackProps {
  stage: string
}

export class RewardServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: IRewardServiceStackProps) {
    super(scope, id, props)

    const serviceName = id.toLowerCase()
    const serviceStage = props.stage.toLowerCase()

    const alarmsTopic = new Topic(this, `Alarms`)
    // eslint-disable-next-line no-new
    new Subscription(this, `Subscription`, {
      topic: alarmsTopic,
      protocol: SubscriptionProtocol.EMAIL,
      endpoint: `alerting-aws-${serviceStage}@republik.io`,
    })

    const logsParserLambda = Function.fromFunctionArn(
      this,
      `logsParserLambda`,
      `arn:aws:lambda:${Stack.of(this).region}:${
        Stack.of(this).account
      }:function:LogsToElasticsearch_republik`
    )

    logsParserLambda.addPermission(`${id}AllowInvoke`, {
      principal: new ServicePrincipal(`logs.amazonaws.com`),
      sourceArn: `arn:aws:logs:${Stack.of(this).region}:${
        Stack.of(this).account
      }:log-group:/aws/lambda/*:*`,
      action: 'lambda:InvokeFunction',
    })

    Tags.of(this).add('service-name', serviceName)
    Tags.of(this).add('service-stage', serviceStage)

    const api = RestApi.fromRestApiAttributes(this, 'PublicRestApi', {
      restApiId: Fn.importValue('PublicRestApiId'),
      rootResourceId: Fn.importValue('PublicRestApiRootResourceId'),
    })

    const coreEventBus = EventBus.fromEventBusArn(
      this,
      'CoreEventBus',
      Fn.importValue('CoreEventBusArn')
    )

    const table = new Table(this, 'RewardServiceStorage', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: '_ph',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: '_ps',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: serviceStage === 'production',
    })

    createTableSecondaryIndices(table, 3)

    if (serviceStage === 'production') {
      const backupS3Arn = StringParameter.valueForStringParameter(
        this,
        `/${serviceStage}/backup-s3-bucket-arn`
      )
      // eslint-disable-next-line no-new
      new DynamodbS3Backup(this, 'RewardStorageBackup', {
        handlerPath: '../app/src/lib/table-backup.ts',
        backupS3Arn,
        backupTable: table,
        serviceName,
      })
    }

    const amplitudeApiConfig = Secret.fromSecretNameV2(
      this,
      'AmplitudeApiConfig',
      `${serviceStage}/amplitude/api`
    )

    const notificationQueue = Queue.fromQueueArn(
      this,
      'NotificationQueueArn',
      Fn.importValue('NotificationQueueArn')
    )

    // eslint-disable-next-line no-new
    new RewardService(this, 'RewardService', {
      api,
      eventBus: coreEventBus,
      serviceStage,
      table,
      alarmsTopic,
      logsParserLambda,
      amplitudeApiConfig,
      notificationQueue,
    })

    const deployment = new Deployment(this, 'RestApiDeployment', {
      api,
    })

    deployment.addToLogicalId(new Date().toISOString())
    const cfnDeployment = deployment.node.defaultChild as CfnDeployment
    cfnDeployment.stageName = serviceStage
  }
}

function createTableSecondaryIndices(table: Table, amount: number = 1) {
  for (let i = 1; i <= amount; i += 1) {
    table.addGlobalSecondaryIndex({
      indexName: `g${i}k`,
      partitionKey: {
        name: `_g${i}h`,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: `_g${i}s`,
        type: AttributeType.STRING,
      },
    })
  }
}
