import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitRouteTablesProps {
  prefix: string;
  vpcId: string;
  internetGatewayId: string;
  internetGatewayAttachment: ec2.CfnVPCGatewayAttachment;
  publicSubnetIds: string[];
  privateSubnetIds: string[];
}

export class ExplicitRouteTables extends Construct {
  readonly publicRouteTableId: string;
  readonly privateRouteTableId: string;

  constructor(scope: Construct, id: string, props: ExplicitRouteTablesProps) {
    super(scope, id);

    // Create public route table for subnets that should be able to reach the internet.
    const publicRouteTable = new ec2.CfnRouteTable(this, "PublicRouteTable", {
      vpcId: props.vpcId,
      tags: [{ key: "Name", value: `${props.prefix}-public-rt` }],
    });

    // Create the private route table for private subnets in this VPC.
    const privateRouteTable = new ec2.CfnRouteTable(this, "PrivateRouteTable", {
      vpcId: props.vpcId,
      tags: [{ key: "Name", value: `${props.prefix}-private-rt` }],
    });

    // Create a route: traffic from public subnets -> 0.0.0.0/0 -> IGW in the public route table; this will lead to internet.
    const publicDefaultRoute = new ec2.CfnRoute(this, "PublicDefaultRoute", {
      routeTableId: publicRouteTable.ref,
      gatewayId: props.internetGatewayId,
      destinationCidrBlock: "0.0.0.0/0",
    });
    publicDefaultRoute.addDependency(props.internetGatewayAttachment);

    // Associate public subnets with the public route table.
    new ec2.CfnSubnetRouteTableAssociation(this, "PublicSubnetAssocA", {
      subnetId: props.publicSubnetIds[0],
      routeTableId: publicRouteTable.ref,
    });
    new ec2.CfnSubnetRouteTableAssociation(this, "PublicSubnetAssocB", {
      subnetId: props.publicSubnetIds[1],
      routeTableId: publicRouteTable.ref,
    });

    // Associate private subnets with the private route table.
    new ec2.CfnSubnetRouteTableAssociation(this, "PrivateSubnetAssocA", {
      subnetId: props.privateSubnetIds[0],
      routeTableId: privateRouteTable.ref,
    });
    new ec2.CfnSubnetRouteTableAssociation(this, "PrivateSubnetAssocB", {
      subnetId: props.privateSubnetIds[1],
      routeTableId: privateRouteTable.ref,
    });

    this.publicRouteTableId = publicRouteTable.ref;
    this.privateRouteTableId = privateRouteTable.ref;
  }
}
