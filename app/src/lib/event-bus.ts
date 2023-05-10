import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
} from '@aws-sdk/client-eventbridge'

const client = new EventBridgeClient({})

export async function publishEvent(event: any, type: string) {
  const commandInput: PutEventsCommandInput = {
    Entries: [
      {
        EventBusName: process.env.EVENT_BUS_ARN,
        Detail: JSON.stringify(event),
        DetailType: type,
        Source: 'io.republik.rewards',
      },
    ],
  }

  return client.send(new PutEventsCommand(commandInput))
}
