import { Construct } from 'constructs'
import { Stage, StageProps } from 'aws-cdk-lib'
import { RewardServiceStack } from './service.stack'

/**
 * Deployable unit
 */
export class RewardServicePipelineStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props)

    // eslint-disable-next-line no-new
    new RewardServiceStack(this, 'RewardService', {
      ...props,
      stage: id.toLowerCase(),
    })
  }
}
