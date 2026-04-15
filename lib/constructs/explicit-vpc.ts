import { CfnOutput, Fn, Tags } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

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

    const vpc = new ec2.CfnVPC(this, 'Vpc', {
      cidrBlock: '10.42.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: [{ key: 'Name', value: `${props.prefix}-vpc` }],
    });

    // Public subnets
    const publicSubnet1 = new ec2.CfnSubnet(this, 'PublicSubnetA', {
      vpcId: vpc.ref,
      cidrBlock: '10.42.0.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: true,
      tags: [{ key: 'Name', value: `${props.prefix}-public-a` }],
    });
    const publicSubnet2 = new ec2.CfnSubnet(this, 'PublicSubnetB', {
      vpcId: vpc.ref,
      cidrBlock: '10.42.1.0/24',
      availabilityZone: 'us-east-1b',
      mapPublicIpOnLaunch: true,
      tags: [{ key: 'Name', value: `${props.prefix}-public-b` }],
    });

    // Private subnet
    const privateSubnet1 = new ec2.CfnSubnet(this, 'PrivateSubnetA', {
      vpcId: vpc.ref,
      cidrBlock: '10.42.10.0/24',
      availabilityZone: 'us-east-1a',
      mapPublicIpOnLaunch: false,
      tags: [{ key: 'Name', value: `${props.prefix}-private-a` }],
    });
    const privateSubnet2 = new ec2.CfnSubnet(this, 'PrivateSubnetB', {
      vpcId: vpc.ref,
      cidrBlock: '10.42.11.0/24',
      availabilityZone: 'us-east-1b',
      mapPublicIpOnLaunch: false,
      tags: [{ key: 'Name', value: `${props.prefix}-private-b` }],
    });

    const internetGateway = new ec2.CfnInternetGateway(
      this,
      'InternetGateway',
      {
        tags: [{ key: 'Name', value: `${props.prefix}-igw` }],
      }
    );

    // Attach the IGW to the VPC before creating routes that depend on it
    const internetGatewayAttachment = new ec2.CfnVPCGatewayAttachment(
      this,
      'InternetGatewayAttachment',
      {
        vpcId: vpc.ref,
        internetGatewayId: internetGateway.ref,
      }
    );

    // Create public route table to the VPC, this can connect to the internet
    const publicRouteTable = new ec2.CfnRouteTable(this, 'PublicRouteTable', {
      vpcId: vpc.ref,
      tags: [{ key: 'Name', value: `${props.prefix}-public-rt` }],
    });

    // Create the private route table for private subnets in this VPC
    const privateRouteTable = new ec2.CfnRouteTable(this, 'PrivateRouteTable', {
      vpcId: vpc.ref,
      tags: [{ key: 'Name', value: `${props.prefix}-private-rt` }],
    });

    // Create a route: traffic from public subnets -> 0.0.0.0/0 -> IGW in the public route table; this will lead to internet
    const publicDefaultRoute = new ec2.CfnRoute(this, 'PublicDefaultRoute', {
      routeTableId: publicRouteTable.ref,
      gatewayId: internetGateway.ref,
      destinationCidrBlock: '0.0.0.0/0',
    });
    publicDefaultRoute.addDependency(internetGatewayAttachment);

    // Associate public subnets with the public route table
    new ec2.CfnSubnetRouteTableAssociation(this, 'PublicSubnetAssocA', {
      subnetId: publicSubnet1.ref,
      routeTableId: publicRouteTable.ref,
    });
    new ec2.CfnSubnetRouteTableAssociation(this, 'PublicSubnetAssocB', {
      subnetId: publicSubnet2.ref,
      routeTableId: publicRouteTable.ref,
    });

    // Associate private subnets with the private route table
    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnetAssocA', {
      subnetId: privateSubnet1.ref,
      routeTableId: privateRouteTable.ref,
    });
    new ec2.CfnSubnetRouteTableAssociation(this, 'PrivateSubnetAssocB', {
      subnetId: privateSubnet2.ref,
      routeTableId: privateRouteTable.ref,
    });

    // allow traffic from anywhere to public subnets on port 80, and allow all outbound traffic from public subnets
    const publicSecurityGroup = new ec2.CfnSecurityGroup(
      this,
      'PublicSecurityGroup',
      {
        groupDescription: 'Public ingress for local lab resources',
        groupName: `${props.prefix}-public-sg`,
        vpcId: vpc.ref,
        securityGroupIngress: [
          {
            cidrIp: '0.0.0.0/0',
            ipProtocol: 'tcp',
            fromPort: 80,
            toPort: 80,
          },
        ],
        securityGroupEgress: [
          {
            cidrIp: '0.0.0.0/0',
            ipProtocol: '-1',
          },
        ],
        tags: [{ key: 'Name', value: `${props.prefix}-public-sg` }],
      }
    );

    const appSecurityGroup = new ec2.CfnSecurityGroup(
      this,
      'AppSecurityGroup',
      {
        groupDescription: 'Application traffic for ECS workloads',
        groupName: `${props.prefix}-app-sg`,
        vpcId: vpc.ref,
        // Support the second hop in the intended flow:
        // internet -> public-facing resource/public SG -> app SG on TCP 80
        // This improves security because the app layer is not opened to 0.0.0.0/0;
        // only resources in the public-facing security group can reach it.
        securityGroupIngress: [
          {
            sourceSecurityGroupId: publicSecurityGroup.attrGroupId,
            ipProtocol: 'tcp',
            fromPort: 80,
            toPort: 80,
          },
        ],
        securityGroupEgress: [
          {
            cidrIp: '0.0.0.0/0',
            ipProtocol: '-1',
          },
        ],
        tags: [{ key: 'Name', value: `${props.prefix}-app-sg` }],
      }
    );

    // Apply a shared Project tag to resources in this construct for grouping and identification.
    // Resources created with `this` as their parent are in this construct scope (e.g new ec2.CfnSecurityGroup(this, ...)), so CDK will try
    // to propagate the tag to all taggable child resources under it.
    Tags.of(this).add('Project', props.prefix);

    this.vpcId = vpc.ref;
    this.publicSubnetIds = [publicSubnet1.ref, publicSubnet2.ref];
    this.privateSubnetIds = [privateSubnet1.ref, privateSubnet2.ref];
    this.publicRouteTableId = publicRouteTable.ref;
    this.privateRouteTableId = privateRouteTable.ref;
    this.internetGatewayId = internetGateway.ref;
    this.publicSecurityGroupId = publicSecurityGroup.attrGroupId;
    this.appSecurityGroupId = appSecurityGroup.attrGroupId;

    /*
     * Output naming notes:
     *
     * - The second parameter to `new CfnOutput(this, 'VpcIdOutput', ...)` is the CDK construct ID.
     * - CDK requires that ID so it can place this output in the construct tree under `this`.
     * - `this` is the current `ExplicitVpc` construct scope, so the output becomes a child in that scope.
     * - CDK tracks the output by its scope + local ID + construct tree path, not just by the raw string `VpcIdOutput`.
     * - During synthesis, CDK turns that path into a generated CloudFormation logical ID, often with extra suffix text for stability and uniqueness.
     * - `exportName` is different: it is the public CloudFormation export name that other stacks or templates can import.
     * - So `VpcIdOutput` is the internal CDK/CloudFormation construct ID, while `${props.prefix}-VpcId` is the external export label.
     */
    new CfnOutput(this, 'VpcIdOutput', {
      exportName: `${props.prefix}-VpcId`,
      value: this.vpcId,
    });

    new CfnOutput(this, 'PublicSubnetIdsOutput', {
      exportName: `${props.prefix}-PublicSubnetIds`,
      value: Fn.join(',', this.publicSubnetIds),
    });

    new CfnOutput(this, 'PrivateSubnetIdsOutput', {
      exportName: `${props.prefix}-PrivateSubnetIds`,
      value: Fn.join(',', this.privateSubnetIds),
    });

    new CfnOutput(this, 'RouteTableIdsOutput', {
      exportName: `${props.prefix}-RouteTableIds`,
      value: Fn.join(',', [this.publicRouteTableId, this.privateRouteTableId]),
    });

    new CfnOutput(this, 'InternetGatewayIdOutput', {
      exportName: `${props.prefix}-InternetGatewayId`,
      value: this.internetGatewayId,
    });

    new CfnOutput(this, 'SecurityGroupIdsOutput', {
      exportName: `${props.prefix}-SecurityGroupIds`,
      value: Fn.join(',', [
        this.publicSecurityGroupId,
        this.appSecurityGroupId,
      ]),
    });
  }
}
