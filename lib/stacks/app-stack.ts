import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ExplicitEcs } from "../constructs/explicit-ecs";
import { ExplicitElb } from "../constructs/explicit-elb";

export interface FoundationReference {
  vpcId: string;
  publicSubnetIds: string[];
  privateSubnetIds: string[];
  publicSecurityGroupId: string;
  appSecurityGroupId: string;
}

export interface AppStackProps extends StackProps {
  foundation: FoundationReference;
}

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const prefix = "ansc01lab";

    const ecsResources = new ExplicitEcs(this, "ExplicitEcs", {
      clusterName: `${prefix}-cluster`,
      repositoryName: `${prefix}-repo`,
    });

    const elbResources = new ExplicitElb(this, "ExplicitElb", {
      loadBalancerName: `${prefix}-nlb`,
      targetGroupName: `${prefix}-tg`,
      subnetIds: props.foundation.publicSubnetIds,
      vpcId: props.foundation.vpcId,
    });

    new CfnOutput(this, "ClusterName", {
      exportName: `${prefix}-ClusterName`,
      value: ecsResources.cluster.clusterName ?? `${prefix}-cluster`,
    });

    new CfnOutput(this, "RepositoryName", {
      exportName: `${prefix}-RepositoryName`,
      value: ecsResources.repository.repositoryName,
    });

    new CfnOutput(this, "LoadBalancerName", {
      exportName: `${prefix}-LoadBalancerName`,
      value: `${prefix}-nlb`,
    });

    new CfnOutput(this, "TargetGroupName", {
      exportName: `${prefix}-TargetGroupName`,
      value: `${prefix}-tg`,
    });

    new CfnOutput(this, "NetworkPlacement", {
      exportName: `${prefix}-NetworkPlacement`,
      value: [
        props.foundation.vpcId,
        props.foundation.publicSecurityGroupId,
        props.foundation.appSecurityGroupId,
        ...props.foundation.privateSubnetIds,
      ].join(","),
    });
  }
}
