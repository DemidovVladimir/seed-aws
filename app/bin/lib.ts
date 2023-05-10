import {
  DynamoDBDocumentClient,
  ScanCommand,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb'

export async function* loadItemsByType(
  client: DynamoDBDocumentClient,
  type: string
) {
  const queryOptions: ScanCommandInput = {
    TableName: process.env.REWARD_TABLE!,
    FilterExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': '_type',
    },
    ExpressionAttributeValues: {
      ':type': type,
    },
  }

  let lastKey

  do {
    const input: ScanCommandInput = {
      ...queryOptions,
      ExclusiveStartKey: lastKey,
    }

    const { Items, LastEvaluatedKey } = await client.send(
      new ScanCommand(input)
    )

    lastKey = LastEvaluatedKey

    yield Items
  } while (lastKey)
}
