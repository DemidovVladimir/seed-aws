import {
  SendMessageCommand,
  SendMessageCommandInput,
  SQSClient,
} from '@aws-sdk/client-sqs'

const sqsClient = new SQSClient({ region: process.env.AWS_REGION })
export interface ISendNotificationCommand {
  command: 'SEND_PUSH_NOTIFICATION'
  details: {
    message: string
    url: string
    participants: string[]
  }
}

export async function createNotificationCommand(
  notificationQueueUrl: string,
  details: ISendNotificationCommand['details']
) {
  const input: SendMessageCommandInput = {
    QueueUrl: notificationQueueUrl,
    MessageBody: JSON.stringify({
      command: 'SEND_PUSH_NOTIFICATION',
      details,
    }),
  }
  return sqsClient.send(new SendMessageCommand(input))
}
