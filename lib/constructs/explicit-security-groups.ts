import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitSecurityGroupsProps {
  prefix: string;
  vpcId: string;
}

export class ExplicitSecurityGroups extends Construct {
  readonly publicSecurityGroupId: string;
  readonly appSecurityGroupId: string;

  constructor(scope: Construct, id: string, props: ExplicitSecurityGroupsProps) {
    super(scope, id);

    // Allow traffic from anywhere to the public-facing layer on port 80, and allow all outbound traffic.
    const publicSecurityGroup = new ec2.CfnSecurityGroup(this, "PublicSecurityGroup", {
      groupDescription: "Public ingress for local lab resources",
      groupName: `${props.prefix}-public-sg`,
      vpcId: props.vpcId,
      securityGroupIngress: [
        {
          cidrIp: "0.0.0.0/0",
          ipProtocol: "tcp",
          fromPort: 80,
          toPort: 80,
        },
      ],
      securityGroupEgress: [
        {
          cidrIp: "0.0.0.0/0",
          ipProtocol: "-1",
        },
      ],
      tags: [{ key: "Name", value: `${props.prefix}-public-sg` }],
    });

    const appSecurityGroup = new ec2.CfnSecurityGroup(this, "AppSecurityGroup", {
      groupDescription: "Application traffic for ECS workloads",
      groupName: `${props.prefix}-app-sg`,
      vpcId: props.vpcId,
      // Support the second hop in the intended flow:
      // internet -> public-facing resource/public SG -> app SG on TCP 80
      // This improves security because the app layer is not opened to 0.0.0.0/0;
      // only resources in the public-facing security group can reach it.
      securityGroupIngress: [
        {
          sourceSecurityGroupId: publicSecurityGroup.attrGroupId,
          ipProtocol: "tcp",
          fromPort: 80,
          toPort: 80,
        },
      ],
      securityGroupEgress: [
        {
          cidrIp: "0.0.0.0/0",
          ipProtocol: "-1",
        },
      ],
      tags: [{ key: "Name", value: `${props.prefix}-app-sg` }],
    });

    this.publicSecurityGroupId = publicSecurityGroup.attrGroupId;
    this.appSecurityGroupId = appSecurityGroup.attrGroupId;
  }
}
