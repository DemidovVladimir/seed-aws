import { injectLambdaContext } from '@aws-lambda-powertools/logger'
import middy from '@middy/core'
import { EventBridgeEvent } from 'aws-lambda'
import { accountRepository } from '../../domain/account.repository'
import { contestRepository } from '../../domain/contest.repository'
import { contestantRepository } from '../../domain/contestant.repository'
import { Repository } from '../../domain/repository'
import { rewardRepository } from '../../domain/reward.repository'
import { rules } from '../../domain/rules'
import { RewardService } from '../../domain/service'
import { ddbDocClient } from '../../lib/db-client'
import { logger } from '../../lib/logger'

export interface IContestantDeletedEvent {
  id: string
}

export type DetailType = 'CONTESTANT_DELETED'
export type EventType = EventBridgeEvent<DetailType, IContestantDeletedEvent>

export const contestantDeletedEventHandler = async ({ detail }: EventType) => {
  logger.debug('contestantDeletedEventHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)

  await service.removeContestant(detail.id)
}

export const handler = middy<EventType>(contestantDeletedEventHandler).use(
  injectLambdaContext(logger)
)
