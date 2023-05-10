import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import middy from '@middy/core'
import { EventBridgeEvent } from 'aws-lambda'
import { accountRepository } from '../../domain/account.repository'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { Repository } from '../../domain/repository'
import { RewardType } from '../../domain/reward.model'
import { rewardRepository } from '../../domain/reward.repository'
import { rules } from '../../domain/rules'
import { RewardService } from '../../domain/service'
import { ddbDocClient } from '../../lib/db-client'
import { logger } from '../../lib/logger'

export interface IEmailVerifiedEvent {
  id: string
}

export type DetailType = 'EMAIL_VERIFIED'
export type EventType = EventBridgeEvent<DetailType, IEmailVerifiedEvent>

export const emailVerifiedEventHandler = async ({ detail }: EventType) => {
  logger.debug('emailVerifiedEventHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  await service.grantReward({
    userId: detail.id,
    reason: {
      type: RewardType.EmailVerified,
    },
  })
}

export const handler = middy<EventType>(emailVerifiedEventHandler).use(
  injectLambdaContext(logger)
)
