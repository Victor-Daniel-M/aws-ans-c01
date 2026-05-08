import { Fn, Stack, aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitSubnetsProps {
  prefix: string;
  vpcId: string;
}

export class ExplicitSubnets extends Construct {
  readonly publicSubnetIds: string[];
  readonly privateSubnetIds: string[];

  constructor(scope: Construct, id: string, props: ExplicitSubnetsProps) {
    super(scope, id);
    const azs = Stack.of(this).availabilityZones;
    const publicAzA = azs[0] ?? Fn.select(0, Fn.getAzs());
    const publicAzB = azs[1] ?? Fn.select(1, Fn.getAzs());

    // Public subnets
    const publicSubnet1 = new ec2.CfnSubnet(this, RESOURCE_IDS.PUBLIC_SUBNET_A, {
      vpcId: props.vpcId,
      cidrBlock: "10.42.0.0/24",
      availabilityZone: publicAzA,
      mapPublicIpOnLaunch: true,
      tags: [{ key: "Name", value: `${props.prefix}-public-a` }],
    });
    const publicSubnet2 = new ec2.CfnSubnet(this, RESOURCE_IDS.PUBLIC_SUBNET_B, {
      vpcId: props.vpcId,
      cidrBlock: "10.42.1.0/24",
      availabilityZone: publicAzB,
      mapPublicIpOnLaunch: true,
      tags: [{ key: "Name", value: `${props.prefix}-public-b` }],
    });

    // Private subnets
    const privateSubnet1 = new ec2.CfnSubnet(this, RESOURCE_IDS.PRIVATE_SUBNET_A, {
      vpcId: props.vpcId,
      cidrBlock: "10.42.10.0/24",
      availabilityZone: publicAzA,
      mapPublicIpOnLaunch: false,
      tags: [{ key: "Name", value: `${props.prefix}-private-a` }],
    });
    const privateSubnet2 = new ec2.CfnSubnet(this, RESOURCE_IDS.PRIVATE_SUBNET_B, {
      vpcId: props.vpcId,
      cidrBlock: "10.42.11.0/24",
      availabilityZone: publicAzB,
      mapPublicIpOnLaunch: false,
      tags: [{ key: "Name", value: `${props.prefix}-private-b` }],
    });

    this.publicSubnetIds = [publicSubnet1.ref, publicSubnet2.ref];
    this.privateSubnetIds = [privateSubnet1.ref, privateSubnet2.ref];
  }
}
