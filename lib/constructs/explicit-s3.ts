import { RemovalPolicy, aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitS3Props {
  bucketName: string;
}

export class ExplicitS3 extends Construct {
  readonly bucket: s3.CfnBucket;

  constructor(scope: Construct, id: string, props: ExplicitS3Props) {
    super(scope, id);

    this.bucket = new s3.CfnBucket(this, "Bucket", {
      bucketName: props.bucketName,
      publicAccessBlockConfiguration: {
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      },
      versioningConfiguration: {
        status: "Enabled",
      },
    });

    this.bucket.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
