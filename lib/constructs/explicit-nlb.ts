import { CfnOutput, aws_elasticloadbalancingv2 as elbv2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OUTPUT_IDS } from "../constants/output-ids";
import { RESOURCE_IDS } from "../constants/resource-ids";

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

    this.loadBalancer = new elbv2.CfnLoadBalancer(this, RESOURCE_IDS.NETWORK_LOAD_BALANCER, {
      name: this.loadBalancerName,
      scheme: "internet-facing",
      subnets: props.subnetIds,
      type: "network",
    });
    this.loadBalancerArn = this.loadBalancer.ref;

    new CfnOutput(this, OUTPUT_IDS.LOAD_BALANCER_NAME, {
      exportName: `${props.prefix}-LoadBalancerName`,
      value: this.loadBalancerName,
    });
  }
}
