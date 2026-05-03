import { CfnOutput, aws_cloudtrail as cloudtrail, aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { OUTPUT_IDS } from '../constants/output-ids';
import { RESOURCE_IDS } from '../constants/resource-ids';

export interface ExplicitCloudTrailProps {
  prefix: string;
  bucket: s3.CfnBucket;
}

export class ExplicitCloudTrail extends Construct {
  readonly trail: cloudtrail.CfnTrail;
  readonly trailName: string;

  constructor(scope: Construct, id: string, props: ExplicitCloudTrailProps) {
    // Register this construct in the CDK construct tree.
    super(scope, id);

    // Derive a predictable trail name from the shared lab prefix.
    this.trailName = `${props.prefix}-trail`;

    // Create a trail to record AWS API activity and deliver the logs to the S3 bucket.
    this.trail = new cloudtrail.CfnTrail(this, RESOURCE_IDS.TRAIL, {
      // Start logging as soon as the trail is created.
      isLogging: true,
      // Keep the lab trail scoped to the configured region instead of all regions.
      isMultiRegionTrail: false,
      // Store CloudTrail log files in the explicit S3 bucket created for this lab.
      s3BucketName: props.bucket.ref,
      // Use an explicit trail name so the lab resource is predictable.
      trailName: this.trailName,
    });

    // Ensure the bucket exists before CloudTrail tries to write logs to it.
    this.trail.node.addDependency(props.bucket);

    // Export the trail name so it can be referenced outside this construct if needed.
    new CfnOutput(this, OUTPUT_IDS.TRAIL_NAME, {
      exportName: `${props.prefix}-TrailName`,
      value: this.trailName,
    });
  }
}
