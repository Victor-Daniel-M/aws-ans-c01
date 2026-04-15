import { aws_elasticloadbalancingv2 as elbv2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitElbProps {
  loadBalancerName: string;
  targetGroupName: string;
  subnetIds: string[];
  vpcId: string;
}

export class ExplicitElb extends Construct {
  readonly loadBalancer: elbv2.CfnLoadBalancer;
  readonly targetGroup: elbv2.CfnTargetGroup;

  constructor(scope: Construct, id: string, props: ExplicitElbProps) {
    super(scope, id);

    this.loadBalancer = new elbv2.CfnLoadBalancer(this, "NetworkLoadBalancer", {
      name: props.loadBalancerName,
      scheme: "internet-facing",
      subnets: props.subnetIds,
      type: "network",
    });

    this.targetGroup = new elbv2.CfnTargetGroup(this, "TargetGroup", {
      name: props.targetGroupName,
      port: 80,
      protocol: "TCP",
      targetType: "ip",
      vpcId: props.vpcId,
    });
  }
}
