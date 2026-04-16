import { CfnOutput, aws_elasticloadbalancingv2 as elbv2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitNlbProps {
  prefix: string;
  subnetIds: string[];
}

export class ExplicitNlb extends Construct {
  readonly loadBalancer: elbv2.CfnLoadBalancer;
  readonly loadBalancerName: string;
  readonly loadBalancerArn: string;

  constructor(scope: Construct, id: string, props: ExplicitNlbProps) {
    super(scope, id);

    this.loadBalancerName = `${props.prefix}-nlb`;

    this.loadBalancer = new elbv2.CfnLoadBalancer(this, "NetworkLoadBalancer", {
      name: this.loadBalancerName,
      scheme: "internet-facing",
      subnets: props.subnetIds,
      type: "network",
    });
    this.loadBalancerArn = this.loadBalancer.ref;

    new CfnOutput(this, "LoadBalancerName", {
      exportName: `${props.prefix}-LoadBalancerName`,
      value: this.loadBalancerName,
    });
  }
}
