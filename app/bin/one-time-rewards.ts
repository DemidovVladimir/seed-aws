import { ScanCommand } from '@aws-sdk/client-dynamodb'
import { Account } from '../src/domain/account.model'
import { accountRepository } from '../src/domain/account.repository'
import { ddbDocClient } from '../src/lib/db-client'
import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge'
import { ScanCommandInput } from '@aws-sdk/lib-dynamodb'
import { logger } from '../src/lib/logger'

const client = new EventBridgeClient({})

async function publishEvent(event: any, type: string) {
  const commandInput: PutEventsCommandInput = {
    Entries: [
      {
        EventBusName: process.env.EVENT_BUS_ARN,
        Detail: JSON.stringify(event),
        DetailType: type,
        Source: 'io.republik.user',
      },
    ],
  }

  return client.send(new PutEventsCommand(commandInput))
}

async function getAccounts(): Promise<Account[]> {
  const input: ScanCommandInput = {
    TableName: process.env.TABLE_NAME!,
    FilterExpression: 'contains(#ph, :account)',
    ExpressionAttributeNames: {
      '#ph': '_ph',
    },
    ExpressionAttributeValues: {
      ':account': { S: 'ACCOUNT#' },
    },
    ProjectionExpression: 'id, userName',
  }

  const scanResults: Account[] = []
  let items

  do {
    items = await ddbDocClient.send(new ScanCommand(input))

    if (!items.Items) {
      return []
    }

    items.Items.forEach((item) => {
      scanResults.push(
        accountRepository.toDomain({
          id: item.id.S,
          userName: item.userName?.S,
        })
      )
    })

    input.ExclusiveStartKey = items.LastEvaluatedKey
  } while (typeof items.LastEvaluatedKey !== 'undefined')
  return scanResults
}

function createPhoneNumberVerifiedEvent(account: Account) {
  return { id: account.id }
}

async function main() {
  const accounts = await getAccounts()
  for (const account of accounts) {
    const phoneNumberVerifiedEvent = createPhoneNumberVerifiedEvent(account)
    await publishEvent(phoneNumberVerifiedEvent, 'PHONE_NUMBER_VERIFIED')
  }
}

main().catch((error) => {
  logger.error('OneTimeRewards', { error })
})
