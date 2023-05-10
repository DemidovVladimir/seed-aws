import { ScanCommandInput, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import Joi from 'joi'
import { accountRepository } from '../src/domain/account.repository'
import { Contest, IContestProps } from '../src/domain/contest.model'
import { contestRepository } from '../src/domain/contest.repository'
import { Contestant, IContestantProps } from '../src/domain/contestant.model'
import { contestantRepository } from '../src/domain/contestant.repository'
import { Repository } from '../src/domain/repository'
import { rewardRepository } from '../src/domain/reward.repository'
import { ddbDocClient } from '../src/lib/db-client'
import { logger } from '../src/lib/logger'

interface EnvVars {
  AWS_PROFILE: string
  AWS_REGION: string
  CONTEST_TABLE: string
  REWARD_TABLE: string
}

function validateEnvVars() {
  const envVarsSchema = Joi.object<EnvVars>({
    AWS_PROFILE: Joi.string().required(),
    AWS_REGION: Joi.string().required(),
    CONTEST_TABLE: Joi.string().required(),
    REWARD_TABLE: Joi.string().required(),
  }).unknown()

  const { error } = envVarsSchema.validate(process.env)

  if (error) {
    throw new Error(`Env Var Validation Error: ${error}`)
  }
}

async function getActiveContestData(): Promise<{
  contests: Contest[]
  contestants: Contestant[]
}> {
  // This will give us all NOT finished contests and ALL contestants
  const input: ScanCommandInput = {
    TableName: process.env.CONTEST_TABLE!,
    FilterExpression: '#status <> :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': { S: 'FINISHED' },
    },
  }

  const contests: Contest[] = []
  const allContestants: Contestant[] = []

  let items

  do {
    items = await ddbDocClient.send(new ScanCommand(input))

    if (!items.Items) {
      return { contests: [], contestants: [] }
    }

    items.Items.forEach((item) => {
      const unmarshalledItem = unmarshall(item)

      if (unmarshalledItem.contest) {
        allContestants.push(
          new Contestant({
            contestId: unmarshalledItem.contest,
            ...unmarshalledItem,
          } as IContestantProps)
        )
      } else {
        contests.push(new Contest(unmarshalledItem as IContestProps))
      }
    })

    input.ExclusiveStartKey = items.LastEvaluatedKey
  } while (typeof items.LastEvaluatedKey !== 'undefined')

  const contestIds = contests.map((contest) => contest.id)

  // only contestants of NOT finished contests
  const contestants = allContestants.filter((contestant) =>
    contestIds.includes(contestant.contestId)
  )

  return { contests, contestants }
}

async function main() {
  validateEnvVars()
  const { contests, contestants } = await getActiveContestData()

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.REWARD_TABLE!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })

  await repository.saveContestsBatch(contests)
  await repository.saveContestantsBatch(contestants)

  logger.debug('SyncContestData', {
    numberOfUpdatedContests: contests.length,
    numberOfUpdatedContestants: contestants.length,
  })
}

main().catch((error) => {
  logger.error('SyncContestData', { error })
})
