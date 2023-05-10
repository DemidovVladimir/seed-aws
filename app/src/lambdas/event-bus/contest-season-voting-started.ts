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

export interface IContestSeasonVotingStartedEvent {
  id: string
  configurationId: string
  name: string
  status: string
}

export type DetailType = 'CONTEST_VOTING_STARTED'
export type EventType = EventBridgeEvent<
  DetailType,
  IContestSeasonVotingStartedEvent
>

export const contestSeasonVotingStartedEventHandler = async ({
  detail,
}: EventType) => {
  logger.debug('contestSeasonVotingStartedEventHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)

  const { id, configurationId, name, status } = detail

  await service.updateContest({
    id,
    configurationId,
    name,
    status,
  })
}

export const handler = middy<EventType>(
  contestSeasonVotingStartedEventHandler
).use(injectLambdaContext(logger))
