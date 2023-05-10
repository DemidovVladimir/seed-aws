#!/usr/bin/env node
import 'source-map-support/register'
import { App } from 'aws-cdk-lib'
import { RewardServiceStack } from '../lib/service.stack'
import { RewardServicePipelineStack } from '../lib/service-pipeline.stack'
import { RewardServiceBuildStack } from '../lib/service-build.stack'

const app = new App()

// eslint-disable-next-line no-new
new RewardServicePipelineStack(app, 'RewardServicePipeline', {
  env: {
    region: 'eu-central-1',
    account: '110017516369',
  },
})

// eslint-disable-next-line no-new
new RewardServiceStack(app, 'RewardService', {
  env: {
    region: 'eu-central-1',
    account: '921116721311',
  },
  stage: 'Development',
})

// eslint-disable-next-line no-new
new RewardServiceBuildStack(app, 'RewardServiceBuild', {
  env: {
    region: 'eu-central-1',
    account: '921116721311',
  },
  stage: 'Development',
})
