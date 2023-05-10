import Joi from 'joi'
import { accountRepository } from '../src/domain/account.repository'
import { contestRepository } from '../src/domain/contest.repository'
import { contestantRepository } from '../src/domain/contestant.repository'
import { Repository } from '../src/domain/repository'
import { rewardRepository } from '../src/domain/reward.repository'
import { ddbDocClient } from '../src/lib/db-client'
import { logger } from '../src/lib/logger'
import * as dotenv from 'dotenv'
import { Account } from '../src/domain/account.model'
import { loadItemsByType } from './lib'
dotenv.config()

interface EnvVars {
  AWS_PROFILE: string
  AWS_REGION: string
  USER_TABLE: string
  REWARD_TABLE: string
}

function validateEnvVars() {
  const envVarsSchema = Joi.object<EnvVars>({
    AWS_PROFILE: Joi.string().required(),
    AWS_REGION: Joi.string().required(),
    USER_TABLE: Joi.string().required(),
    REWARD_TABLE: Joi.string().required(),
  }).unknown()

  const { error } = envVarsSchema.validate(process.env)

  if (error) {
    throw new Error(`Env Var Validation Error: ${error}`)
  }
}

async function main() {
  validateEnvVars()

  const repository = new Repository({
    client: ddbDocClient,
    tableName: process.env.REWARD_TABLE!,
    accountAdapter: accountRepository,
    rewardAdapter: rewardRepository,
    contestAdapter: contestRepository,
    contestantAdapter: contestantRepository,
  })

  const accountsToSave = []
  for await (const page of loadItemsByType(ddbDocClient, 'ACCOUNT')) {
    if (!page) continue
    accountsToSave.push(page.filter((item) => item.refUsername))
  }
  repository.saveAccountsBatch(accountsToSave as Account[])

  logger.debug('SyncUsersData', {
    numberOfUpdatedAccounts: accountsToSave.length,
  })
}

main().catch((error) => {
  logger.error('SyncUsersData', { error })
})
