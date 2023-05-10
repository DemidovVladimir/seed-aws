import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const clientConfig: DynamoDBClientConfig = process.env.JEST_WORKER_ID
  ? {
      endpoint: 'http://localhost:8000',
      region: 'localhost',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    }
  : {
      region: process.env.AWS_REGION,
    }

export const ddbClient = new DynamoDBClient(clientConfig)

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: true, // false, by default.
}

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
}

const translateConfig = { marshallOptions, unmarshallOptions }

// Create the DynamoDB Document client.
export const ddbDocClient = DynamoDBDocumentClient.from(
  ddbClient,
  translateConfig
)
