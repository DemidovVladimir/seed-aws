import Joi from 'joi'
import { ddbDocClient } from '../src/lib/db-client'
import { loadItemsByType } from './lib'

function validateEnvVars() {
  const envVarsSchema = Joi.object<any>({
    AWS_PROFILE: Joi.string().required(),
    AWS_REGION: Joi.string().required(),
    REWARD_TABLE: Joi.string().required(),
  }).unknown()

  const { error } = envVarsSchema.validate(process.env)

  if (error) {
    throw new Error(`Env Var Validation Error: ${error}`)
  }
}

async function main() {
  validateEnvVars()

  let totalXp = 0

  for await (const page of loadItemsByType(ddbDocClient, 'ACCOUNT')) {
    if (!page) continue

    for (const account of page) {
      if (account.xp) {
        totalXp = totalXp + account.xp
      }
    }
  }

  console.log(totalXp, '...total XP on the platform')
}

main().catch(console.error)
