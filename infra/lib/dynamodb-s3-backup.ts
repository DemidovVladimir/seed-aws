import { Duration } from 'aws-cdk-lib'
import { Table } from 'aws-cdk-lib/aws-dynamodb'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export interface IDynamodbS3BackupProps {
  handlerPath: string
  backupTable: Table
  backupS3Arn: string
  serviceName: string
}

export class DynamodbS3Backup extends Construct {
  constructor(
    scope: Construct,
    id: string,
    {
      backupS3Arn,
      backupTable,
      serviceName,
      handlerPath,
    }: IDynamodbS3BackupProps
  ) {
    super(scope, id)

    const storage = Bucket.fromBucketArn(this, 'BackupBucket', backupS3Arn)
    const handler = new NodejsFunction(this, `Backup`, {
      runtime: Runtime.NODEJS_16_X,
      entry: handlerPath,
      awsSdkConnectionReuse: true,
      handler: 'handler',
      environment: {
        BACKUP_TABLE_ARN: backupTable.tableArn,
        BACKUP_S3_NAME: storage.bucketName,
        BACKUP_PREFIX: `${serviceName}/${backupTable.tableName}`,
      },
      bundling: {
        sourceMap: true,
        sourceMapMode: SourceMapMode.DEFAULT,
      },
    })

    storage.grantReadWrite(handler)
    backupTable.grant(handler, 'dynamodb:ExportTableToPointInTime')

    const rule = new Rule(this, 'BackupDynamodbRule', {
      schedule: Schedule.rate(Duration.hours(1)),
    })

    rule.addTarget(new LambdaFunction(handler))
  }
}
