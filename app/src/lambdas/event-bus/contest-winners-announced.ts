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

export interface IWinner {
  userId: string
  username: string
  avatarUrl: string
  votes: number
}

export interface IContestSeasonWinnersAnnouncedEvent {
  contestId: string
  winners: IWinner[]
  voterIds: string[]
}

export type DetailType = 'CONTEST_SEASON_WINNERS_ANNOUNCED'
export type EventType = EventBridgeEvent<
  DetailType,
  IContestSeasonWinnersAnnouncedEvent
>

export const contestWinnersEventHandler = async ({ detail }: EventType) => {
  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  const { contestId, winners } = detail

  const promises = winners.map((winner, idx) =>
    service.grantReward({
      userId: winner.userId,
      reason: {
        type: RewardType.ContestWinner,
        contestId,
        position: idx + 1,
      },
    })
  )

  await Promise.all(promises)
}

export const handler = middy<EventType>(contestWinnersEventHandler)
