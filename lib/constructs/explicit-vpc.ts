import { CfnOutput, Fn, Tags } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CONSTRUCT_IDS } from '../constants/construct-ids';
import { OUTPUT_IDS } from '../constants/output-ids';
import { RESOURCE_IDS } from '../constants/resource-ids';
import { ExplicitInternetGateway } from './explicit-internet-gateway';
import { ExplicitRouteTables } from './explicit-route-tables';
import { ExplicitSecurityGroups } from './explicit-security-groups';
import { ExplicitSubnets } from './explicit-subnets';

/*
Subnetting notes:

/24
11111111.11111111.11111111.00000000

/27 from /24
11111111.11111111.11111111.SSSHHHHH

Networks from SSS = 2^3 = 8
Hosts = 2^5 = 32 - AWS reserved = 27 usable

Given CIDR 10.42.7.0/24, /27 subnets are derived by incrementing the
subnet/network bits while host bits vary inside each subnet:

000 00000 = 0
001 00000 = 32
010 00000 = 64
011 00000 = 96
100 00000 = 128
101 00000 = 160
110 00000 = 192
111 00000 = 224

Host bits vary from:
00000 to 11111 -> 32 addresses total

Examples:
- First network: 10.42.7.0/27, first AWS-usable IP: 10.42.7.4
- Second network: 10.42.7.32/27, first AWS-usable IP: 10.42.7.36
- Last network: 10.42.7.224/27, last AWS-usable IP: 10.42.7.254

Different subnet sizes can be mixed as long as their address ranges do not
overlap.

----------------------------------------------------------------------------------------

/16 VPC carved into /24 subnets
10.42.0.0/16

Treat the third octet as subnet bits and the fourth octet as host bits:
SSSSSSSS.HHHHHHHH

Number of /24 subnets = 2^8 = 256
Addresses per /24 subnet = 2^8 = 256

Examples:
- First subnet: 10.42.0.0/24
  First AWS-usable IP: 10.42.0.4
  Last AWS-usable IP: 10.42.0.254
- Second subnet: 10.42.1.0/24
  First AWS-usable IP: 10.42.1.4
  Last AWS-usable IP: 10.42.1.254
- Last subnet: 10.42.255.0/24
  First AWS-usable IP: 10.42.255.4
  Last AWS-usable IP: 10.42.255.254

AWS reserves addresses per subnet, so there is no cross-subnet conflict with
gateway/router-related reserved IPs like .1; each /24 has its own reserved set.

Terminology:
- Association = a configuration relationship; this resource should use that resource
- Attachment = a physical or logical connection between infrastructure components
- In this file, subnet -> route table is an association, while IGW -> VPC is an attachment
*/
export interface ExplicitVpcProps {
  prefix: string;
}

export class ExplicitVpc extends Construct {
  readonly vpcId: string;
  readonly publicSubnetIds: string[];
  readonly privateSubnetIds: string[];
  readonly publicRouteTableId: string;
  readonly privateRouteTableId: string;
  readonly internetGatewayId: string;
  readonly publicSecurityGroupId: string;
  readonly appSecurityGroupId: string;

  constructor(scope: Construct, id: string, props: ExplicitVpcProps) {
    super(scope, id);

    const vpc = new ec2.CfnVPC(this, RESOURCE_IDS.VPC, {
      cidrBlock: '10.42.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: [{ key: 'Name', value: `${props.prefix}-vpc` }],
    });

    const subnets = new ExplicitSubnets(this, CONSTRUCT_IDS.EXPLICIT_SUBNETS, {
      prefix: props.prefix,
      vpcId: vpc.ref,
    });

    const internetGateway = new ExplicitInternetGateway(this, CONSTRUCT_IDS.EXPLICIT_INTERNET_GATEWAY, {
      prefix: props.prefix,
      vpcId: vpc.ref,
    });

    const routeTables = new ExplicitRouteTables(this, CONSTRUCT_IDS.EXPLICIT_ROUTE_TABLES, {
      prefix: props.prefix,
      vpcId: vpc.ref,
      internetGatewayId: internetGateway.internetGatewayId,
      internetGatewayAttachment: internetGateway.attachment,
      publicSubnetIds: subnets.publicSubnetIds,
      privateSubnetIds: subnets.privateSubnetIds,
    });

    const securityGroups = new ExplicitSecurityGroups(this, CONSTRUCT_IDS.EXPLICIT_SECURITY_GROUPS, {
      prefix: props.prefix,
      vpcId: vpc.ref,
    });

    // Apply a shared Project tag to resources in this construct for grouping and identification.
    // Resources created with `this` as their parent are in this construct scope (e.g new ec2.CfnSecurityGroup(this, ...)), so CDK will try
    // to propagate the tag to all taggable child resources under it.
    Tags.of(this).add('Project', props.prefix);

    this.vpcId = vpc.ref;
    this.publicSubnetIds = subnets.publicSubnetIds;
    this.privateSubnetIds = subnets.privateSubnetIds;
    this.publicRouteTableId = routeTables.publicRouteTableId;
    this.privateRouteTableId = routeTables.privateRouteTableId;
    this.internetGatewayId = internetGateway.internetGatewayId;
    this.publicSecurityGroupId = securityGroups.publicSecurityGroupId;
    this.appSecurityGroupId = securityGroups.appSecurityGroupId;

    /*
     * Output naming notes:
     *
     * - The second parameter to `new CfnOutput(this, OUTPUT_IDS.VPC_ID, ...)` is the CDK construct ID.
     * - CDK requires that ID so it can place this output in the construct tree under `this`.
     * - `this` is the current `ExplicitVpc` construct scope, so the output becomes a child in that scope.
     * - CDK tracks the output by its scope + local ID + construct tree path, not just by the raw string in `OUTPUT_IDS.VPC_ID`.
     * - During synthesis, CDK turns that path into a generated CloudFormation logical ID, often with extra suffix text for stability and uniqueness.
     * - `exportName` is different: it is the public CloudFormation export name that other stacks or templates can import.
     * - So `OUTPUT_IDS.VPC_ID` is the internal CDK/CloudFormation construct ID, while `${props.prefix}-VpcId` is the external export label.
     */
    new CfnOutput(this, OUTPUT_IDS.VPC_ID, {
      exportName: `${props.prefix}-VpcId`,
      value: this.vpcId,
    });

    new CfnOutput(this, OUTPUT_IDS.PUBLIC_SUBNET_IDS, {
      exportName: `${props.prefix}-PublicSubnetIds`,
      value: Fn.join(',', this.publicSubnetIds),
    });

    new CfnOutput(this, OUTPUT_IDS.PRIVATE_SUBNET_IDS, {
      exportName: `${props.prefix}-PrivateSubnetIds`,
      value: Fn.join(',', this.privateSubnetIds),
    });

    new CfnOutput(this, OUTPUT_IDS.ROUTE_TABLE_IDS, {
      exportName: `${props.prefix}-RouteTableIds`,
      value: Fn.join(',', [this.publicRouteTableId, this.privateRouteTableId]),
    });

    new CfnOutput(this, OUTPUT_IDS.INTERNET_GATEWAY_ID, {
      exportName: `${props.prefix}-InternetGatewayId`,
      value: this.internetGatewayId,
    });

    new CfnOutput(this, OUTPUT_IDS.SECURITY_GROUP_IDS, {
      exportName: `${props.prefix}-SecurityGroupIds`,
      value: Fn.join(',', [
        this.publicSecurityGroupId,
        this.appSecurityGroupId,
      ]),
    });
  }
}
