import Joi from 'joi'
import { chunk } from 'lodash'
import amplitude from '../src/lib/amplitude'
import { ddbDocClient } from '../src/lib/db-client'
import { logger } from '../src/lib/logger'
import { loadItemsByType } from './lib'

function validateEnvVars() {
  const envVarsSchema = Joi.object<any>({
    AWS_PROFILE: Joi.string().required(),
    AWS_REGION: Joi.string().required(),
    AMPLITUDE_ENDPOINT: Joi.string().required(),
    AMPLITUDE_API_KEY: Joi.string().required(),
    REWARD_TABLE: Joi.string().required(),
  }).unknown()

  const { error } = envVarsSchema.validate(process.env)

  if (error) {
    throw new Error(`Env Var Validation Error: ${error}`)
  }
}

async function main() {
  validateEnvVars()

  for await (const page of loadItemsByType(ddbDocClient, 'ACCOUNT')) {
    if (!page) continue

    const requests = []

    for (const account of page) {
      requests.push(
        amplitude
          .identify({
            user_id: account.id,
            user_properties: {
              userTotalXP: account.xp,
            },
          })
          .catch((error: any) => {
            logger.error('SyncAmplitudeTotalXP#updateError:', { error })
          })
      )
    }

    const requestChunks = chunk(requests, 10)

    for (const chunk of requestChunks) {
      await Promise.all(chunk)
    }
  }
}

main().catch((error) => {
  logger.error('SyncAmplitudeTotalXP', { error })
})
