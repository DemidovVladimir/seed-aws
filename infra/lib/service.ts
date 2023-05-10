import { Duration, Fn } from 'aws-cdk-lib'
import { AuthorizationType, IRestApi } from 'aws-cdk-lib/aws-apigateway'
import { Table } from 'aws-cdk-lib/aws-dynamodb'
import { IEventBus } from 'aws-cdk-lib/aws-events'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { IQueue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import { EventBusHandler } from './event-bus-handler'
import { RestEndpoint } from './rest-endpoint'

export interface IRewardService {
  serviceStage: string
  api: IRestApi
  eventBus: IEventBus
  table: Table
  alarmsTopic: Topic
  logsParserLambda: IFunction
  amplitudeApiConfig: ISecret
  notificationQueue: IQueue
}

export class RewardService extends Construct {
  constructor(scope: Construct, id: string, props: IRewardService) {
    super(scope, id)

    const amplitudeEnvs = {
      AMPLITUDE_API_KEY: props.amplitudeApiConfig
        .secretValueFromJson('key')
        .toString(),
      AMPLITUDE_TOKEN_ENDPOINT: props.amplitudeApiConfig
        .secretValueFromJson('endpoint')
        .toString(),
    }

    const userCreatedEventHandler = new EventBusHandler(
      this,
      'UserCreatedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/user-created.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['USER_PROFILE_COMPLETED'],
          source: ['io.republik.user'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          NOTIFICATION_QUEUE_URL: props.notificationQueue.queueUrl,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(userCreatedEventHandler.handler)
    props.eventBus.grantPutEventsTo(userCreatedEventHandler.handler)
    props.notificationQueue.grantSendMessages(userCreatedEventHandler.handler)

    const userUpdatedEventHandler = new EventBusHandler(
      this,
      'UserUpdatedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/user-updated.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['USER_UPDATED'],
          source: ['io.republik.user'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(userUpdatedEventHandler.handler)

    const contestantJoinedEventHandler = new EventBusHandler(
      this,
      'ContestantJoinedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/contestant-joined.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTESTANT_JOINED'],
          source: ['io.republik.contest'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(contestantJoinedEventHandler.handler)
    props.eventBus.grantPutEventsTo(contestantJoinedEventHandler.handler)

    const voteCreatedEventHandler = new EventBusHandler(
      this,
      'VoteCreatedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/vote-created.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['VOTE_CREATED'],
          source: ['io.republik.voting'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(voteCreatedEventHandler.handler)
    props.eventBus.grantPutEventsTo(voteCreatedEventHandler.handler)

    const winnersAnnouncedEventHandler = new EventBusHandler(
      this,
      'WinnersAnnouncedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/contest-winners-announced.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTEST_SEASON_WINNERS_ANNOUNCED'],
          source: ['io.republik.voting'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(winnersAnnouncedEventHandler.handler)
    props.eventBus.grantPutEventsTo(winnersAnnouncedEventHandler.handler)

    const getAccountRestEndpoint = new RestEndpoint(
      this,
      'GetAccountRestEndpoint',
      {
        api: props.api,
        entry: '../app/src/lambdas/api-gateway/account.get.ts',
        httpMethod: 'GET',
        path: '/accounts/{accountId}',
        authorizer: {
          authorizationType: AuthorizationType.COGNITO,
          authorizerId: Fn.importValue('RestApiCognitoAuthorizerId'),
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadData(getAccountRestEndpoint.handler)

    const createCustomRewardRestEndpoint = new RestEndpoint(
      this,
      'CreateCustomRewardRestEndpoint',
      {
        api: props.api,
        entry: '../app/src/lambdas/api-gateway/reward.create.ts',
        httpMethod: 'POST',
        path: '/rewards',
        authorizer: {
          authorizationType: AuthorizationType.COGNITO,
          authorizerId: Fn.importValue('RestApiCognitoAuthorizerId'),
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
          NOTIFICATION_QUEUE_URL: props.notificationQueue.queueUrl,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(createCustomRewardRestEndpoint.handler)
    props.eventBus.grantPutEventsTo(createCustomRewardRestEndpoint.handler)
    props.notificationQueue.grantSendMessages(
      createCustomRewardRestEndpoint.handler
    )

    const phoneNumberVerifiedEventHandler = new EventBusHandler(
      this,
      'PhoneNumberVerifiedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/phone-number-verified.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['PHONE_NUMBER_VERIFIED'],
          source: ['io.republik.user'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(phoneNumberVerifiedEventHandler.handler)
    props.eventBus.grantPutEventsTo(phoneNumberVerifiedEventHandler.handler)

    const userFollowedEventHandler = new EventBusHandler(
      this,
      'UserFollowedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/user-followed.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['USER_FOLLOWED'],
          source: ['io.republik.user'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
          NOTIFICATION_QUEUE_URL: props.notificationQueue.queueUrl,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(userFollowedEventHandler.handler)
    props.eventBus.grantPutEventsTo(userFollowedEventHandler.handler)

    const referredUserXpMilestoneReachedEventHandler = new EventBusHandler(
      this,
      'ReferredUserXpMilestoneReachedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/referred-user-xp-reward.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['REWARD_GRANTED'],
          source: ['io.republik.rewards'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
          NOTIFICATION_QUEUE_URL: props.notificationQueue.queueUrl,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(
      referredUserXpMilestoneReachedEventHandler.handler
    )
    props.eventBus.grantPutEventsTo(
      referredUserXpMilestoneReachedEventHandler.handler
    )
    props.notificationQueue.grantSendMessages(
      referredUserXpMilestoneReachedEventHandler.handler
    )

    const emailVerifiedEventHandler = new EventBusHandler(
      this,
      'EmailVerifiedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/email-verified.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['EMAIL_VERIFIED'],
          source: ['io.republik.user'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          EVENT_BUS_ARN: props.eventBus.eventBusArn,
          ...amplitudeEnvs,
        },
        timeout: Duration.seconds(20),
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(emailVerifiedEventHandler.handler)
    props.eventBus.grantPutEventsTo(emailVerifiedEventHandler.handler)

    const contestSeasonCreatedEventHandler = new EventBusHandler(
      this,
      'ContestSeasonCreatedEventHandlerEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/contest-season-created.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTEST_SEASON_CREATED'],
          source: ['io.republik.contest'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(contestSeasonCreatedEventHandler.handler)

    const contestSeasonVotingStartedEventHandler = new EventBusHandler(
      this,
      'contestSeasonVotingStartedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/contest-season-voting-started.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTEST_VOTING_STARTED'],
          source: ['io.republik.contest'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(
      contestSeasonVotingStartedEventHandler.handler
    )

    const contestSeasonDeletedOrFinishedEventHandler = new EventBusHandler(
      this,
      'ContestSeasonDeletedOrFinishedEventHandler',
      {
        entry:
          '../app/src/lambdas/event-bus/contest-season-deleted-finished.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTEST_SEASON_DELETED', 'CONTEST_SEASON_FINISHED'],
          source: ['io.republik.contest'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(
      contestSeasonDeletedOrFinishedEventHandler.handler
    )

    const contestantDeletedEventHandler = new EventBusHandler(
      this,
      'ContestantDeletedEventHandler',
      {
        entry: '../app/src/lambdas/event-bus/contestant-deleted.ts',
        eventBus: props.eventBus,
        eventPattern: {
          detailType: ['CONTESTANT_DELETED'],
          source: ['io.republik.contest'],
        },
        environment: {
          TABLE_NAME: props.table.tableName,
          ...amplitudeEnvs,
        },
        alarmsTopic: props.alarmsTopic,
        logsParserLambda: props.logsParserLambda,
      }
    )

    props.table.grantReadWriteData(contestantDeletedEventHandler.handler)
  }
}
