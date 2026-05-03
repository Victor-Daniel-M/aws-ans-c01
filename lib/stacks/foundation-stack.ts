import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { CONSTRUCT_IDS } from "../constants/construct-ids";
import { ExplicitCloudTrail } from "../constructs/explicit-cloudtrail";
import { ExplicitS3 } from "../constructs/explicit-s3";
import { ExplicitVpc } from "../constructs/explicit-vpc";

export interface FoundationStackProps extends StackProps {
  prefix: string;
}

export class FoundationStack extends Stack {
  readonly vpc: ExplicitVpc;
  readonly bucketName: string;
  readonly trailName: string;

  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);

    this.vpc = new ExplicitVpc(this, CONSTRUCT_IDS.EXPLICIT_VPC, { prefix: props.prefix });

    const bucket = new ExplicitS3(this, CONSTRUCT_IDS.EXPLICIT_S3, {
      prefix: props.prefix,
    });

    const trail = new ExplicitCloudTrail(this, CONSTRUCT_IDS.EXPLICIT_CLOUDTRAIL, {
      prefix: props.prefix,
      bucket: bucket.bucket,
    });

    this.bucketName = bucket.bucketName;
    this.trailName = trail.trailName;
  }
}
