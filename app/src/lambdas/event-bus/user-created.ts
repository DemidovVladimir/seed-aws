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
import { createNotificationCommand } from '../../lib/sqs'

export interface IUserCreatedEvent {
  id: string
  username: string
  refUsername?: string
}

export type DetailType = 'USER_PROFILE_COMPLETED'
export type EventType = EventBridgeEvent<DetailType, IUserCreatedEvent>

export const userCreatedEventHandler = async ({ detail }: EventType) => {
  logger.debug('userCreatedHandler', { detail })

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.TABLE_NAME!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })
  const service = new RewardService(repository, rules)
  const { id, username, refUsername } = detail

  logger.debug('refUsername', { refUsername })

  await service.addAccount({ id, username, refUsername })

  if (refUsername) {
    const referrer = await service.getAccountByName(refUsername)
    if (referrer) {
      const referrerReward = await service.grantReward({
        userId: referrer.id,
        reason: {
          type: RewardType.InviteAcceptedReferral,
          refereeUsername: username,
        },
      })

      if (referrerReward) {
        const message = `You earned ${referrerReward.reward}XP because @${username} used your referral link!`
        const participants = [referrer.id]
        const url = `profile/${id}`

        const result = await createNotificationCommand(
          process.env.NOTIFICATION_QUEUE_URL!,
          { message, url, participants }
        )

        logger.debug(
          'user-created#send-referrer-push-notification',
          { message, url, participants },
          { result }
        )
      }

      await service.grantReward({
        userId: id,
        reason: {
          type: RewardType.InviteAcceptedUser,
        },
      })
    } else {
      logger.warn('referral not found', { username: refUsername })
    }
  }
}

export const handler = middy<EventType>(userCreatedEventHandler).use(
  injectLambdaContext(logger)
)
