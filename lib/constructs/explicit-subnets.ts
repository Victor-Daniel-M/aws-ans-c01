import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitSubnetsProps {
  prefix: string;
  vpcId: string;
}

export class ExplicitSubnets extends Construct {
  readonly publicSubnetIds: string[];
  readonly privateSubnetIds: string[];

  constructor(scope: Construct, id: string, props: ExplicitSubnetsProps) {
    super(scope, id);

    // Public subnets
    const publicSubnet1 = new ec2.CfnSubnet(this, "PublicSubnetA", {
      vpcId: props.vpcId,
      cidrBlock: "10.42.0.0/24",
      availabilityZone: "us-east-1a",
      mapPublicIpOnLaunch: true,
      tags: [{ key: "Name", value: `${props.prefix}-public-a` }],
    });
    const publicSubnet2 = new ec2.CfnSubnet(this, "PublicSubnetB", {
      vpcId: props.vpcId,
      cidrBlock: "10.42.1.0/24",
      availabilityZone: "us-east-1b",
      mapPublicIpOnLaunch: true,
      tags: [{ key: "Name", value: `${props.prefix}-public-b` }],
    });

    // Private subnets
    const privateSubnet1 = new ec2.CfnSubnet(this, "PrivateSubnetA", {
      vpcId: props.vpcId,
      cidrBlock: "10.42.10.0/24",
      availabilityZone: "us-east-1a",
      mapPublicIpOnLaunch: false,
      tags: [{ key: "Name", value: `${props.prefix}-private-a` }],
    });
    const privateSubnet2 = new ec2.CfnSubnet(this, "PrivateSubnetB", {
      vpcId: props.vpcId,
      cidrBlock: "10.42.11.0/24",
      availabilityZone: "us-east-1b",
      mapPublicIpOnLaunch: false,
      tags: [{ key: "Name", value: `${props.prefix}-private-b` }],
    });

    this.publicSubnetIds = [publicSubnet1.ref, publicSubnet2.ref];
    this.privateSubnetIds = [privateSubnet1.ref, privateSubnet2.ref];
  }
}
