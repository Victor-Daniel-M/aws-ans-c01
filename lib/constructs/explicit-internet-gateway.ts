import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitInternetGatewayProps {
  prefix: string;
  vpcId: string;
}

export class ExplicitInternetGateway extends Construct {
  readonly internetGatewayId: string;
  readonly attachment: ec2.CfnVPCGatewayAttachment;

  constructor(scope: Construct, id: string, props: ExplicitInternetGatewayProps) {
    super(scope, id);

    const internetGateway = new ec2.CfnInternetGateway(this, RESOURCE_IDS.INTERNET_GATEWAY, {
      tags: [{ key: "Name", value: `${props.prefix}-igw` }],
    });

    // Attach the IGW to the VPC before creating routes that depend on it.
    this.attachment = new ec2.CfnVPCGatewayAttachment(this, RESOURCE_IDS.INTERNET_GATEWAY_ATTACHMENT, {
      vpcId: props.vpcId,
      internetGatewayId: internetGateway.ref,
    });

    this.internetGatewayId = internetGateway.ref;
  }
}
