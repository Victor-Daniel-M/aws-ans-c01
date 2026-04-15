import { CfnOutput, Stack, StackProps, aws_cloudtrail as cloudtrail } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ExplicitS3 } from "../constructs/explicit-s3";
import { ExplicitVpc } from "../constructs/explicit-vpc";

export class FoundationStack extends Stack {
  readonly vpc: ExplicitVpc;
  readonly bucketName: string;
  readonly trailName: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const prefix = "ansc01lab";
    const bucketName = `${prefix}-artifacts`;

    this.vpc = new ExplicitVpc(this, "ExplicitVpc", { prefix });

    const bucket = new ExplicitS3(this, "ExplicitS3", {
      bucketName,
    });

    this.bucketName = bucketName;
    this.trailName = `${prefix}-trail`;

    const trail = new cloudtrail.CfnTrail(this, "Trail", {
      isLogging: true,
      isMultiRegionTrail: false,
      s3BucketName: this.bucketName,
      trailName: this.trailName,
    });
    trail.node.addDependency(bucket.bucket);

    new CfnOutput(this, "BucketName", {
      exportName: `${prefix}-BucketName`,
      value: this.bucketName,
    });

    new CfnOutput(this, "TrailName", {
      exportName: `${prefix}-TrailName`,
      value: this.trailName,
    });
  }
}
