import { Construct } from 'constructs'
import { Fn, Stack, StackProps } from 'aws-cdk-lib'
import {
  CodePipeline,
  CodePipelineSource,
  ManualApprovalStep,
  ShellStep,
} from 'aws-cdk-lib/pipelines'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { RewardServicePipelineStage } from './service-pipeline.stage'
import { SlackChannelConfiguration } from 'aws-cdk-lib/aws-chatbot'
import { PipelineNotificationEvents } from 'aws-cdk-lib/aws-codepipeline'

export class RewardServicePipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const githubConnectionArn = StringParameter.valueForStringParameter(
      this,
      'GITHUB_CONNECTION_ARN'
    )
    const owner = this.node.tryGetContext('github_alias')
    const repo = this.node.tryGetContext('github_repo')
    const branch = this.node.tryGetContext('github_branch')

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'RewardServicePipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.connection(`${owner}/${repo}`, branch, {
          connectionArn: githubConnectionArn,
        }),
        commands: [
          'yarn install --frozen-lockfile',
          'yarn workspace infra cdk synth',
        ],
        primaryOutputDirectory: 'infra/cdk.out',
      }),
      dockerEnabledForSynth: true,
      crossAccountKeys: true,
      selfMutation: true,
    })

    pipeline.addStage(
      new RewardServicePipelineStage(this, 'Staging', {
        env: {
          account: '543875645874',
          region: 'eu-central-1',
        },
      })
    )

    pipeline.addStage(
      new RewardServicePipelineStage(this, 'Production', {
        env: {
          account: '568014293941',
          region: 'ap-southeast-1',
        },
      }),
      {
        pre: [new ManualApprovalStep('PromoteToProduction')],
      }
    )

    const slackNotificationTarget =
      SlackChannelConfiguration.fromSlackChannelConfigurationArn(
        this,
        'SlackChannelConfiguration',
        Fn.importValue('SlackChannelConfigurationArn')
      )

    pipeline.buildPipeline()

    pipeline.pipeline.notifyOn('OnAnyFailure', slackNotificationTarget, {
      events: [
        PipelineNotificationEvents.ACTION_EXECUTION_FAILED,
        PipelineNotificationEvents.STAGE_EXECUTION_FAILED,
        PipelineNotificationEvents.PIPELINE_EXECUTION_FAILED,
        PipelineNotificationEvents.MANUAL_APPROVAL_FAILED,
      ],
    })
  }
}
