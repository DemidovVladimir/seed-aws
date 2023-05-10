import {
  ExportTableToPointInTimeCommand,
  ExportTableToPointInTimeCommandInput,
} from '@aws-sdk/client-dynamodb'
import { ddbClient } from './db-client'
import { logger } from './logger'

export async function handler() {
  logger.info('table recovery scheduler')

  try {
    const params: ExportTableToPointInTimeCommandInput = {
      S3Bucket: process.env.BACKUP_S3_NAME,
      TableArn: process.env.BACKUP_TABLE_ARN,
      S3Prefix: process.env.BACKUP_PREFIX,
    }

    const result = await ddbClient.send(
      new ExportTableToPointInTimeCommand(params)
    )

    logger.debug('result', JSON.stringify(result, null, 2))
  } catch (error) {
    logger.error('error', { error })
    throw error
  }
}
