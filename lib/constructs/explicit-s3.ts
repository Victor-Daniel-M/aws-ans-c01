import { CfnOutput, RemovalPolicy, aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitS3Props {
  prefix: string;
}

export class ExplicitS3 extends Construct {
  readonly bucket: s3.CfnBucket;
  readonly bucketName: string;

  constructor(scope: Construct, id: string, props: ExplicitS3Props) {
    // Register this construct in the CDK construct tree.
    super(scope, id);

    // Derive a predictable bucket name from the shared lab prefix.
    this.bucketName = `${props.prefix}-artifacts`;

    this.bucket = new s3.CfnBucket(this, "Bucket", {
      // Use an explicit bucket name so the lab resource is predictable.
      bucketName: this.bucketName,
      // Block public access through ACLs and bucket policies.
      publicAccessBlockConfiguration: {
        // Prevent new public ACLs from being applied to the bucket or its objects.
        blockPublicAcls: true,
        // Prevent bucket policies that would make the bucket public.
        blockPublicPolicy: true,
        // Ignore any public ACLs that may already exist.
        ignorePublicAcls: true,
        // Restrict public access even if a bucket policy is public.
        restrictPublicBuckets: true,
      },
      // Keep object versions so changes and deletes can be recovered.
      versioningConfiguration: {
        status: "Enabled",
      },
    });

    // Remove the bucket with the stack to support clean lab teardown.
    this.bucket.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Export the bucket name so it can be referenced outside this construct if needed.
    new CfnOutput(this, "BucketName", {
      exportName: `${props.prefix}-BucketName`,
      value: this.bucketName,
    });
  }
}
