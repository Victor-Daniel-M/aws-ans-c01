import { aws_elasticloadbalancingv2 as elbv2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitListenerProps {
  loadBalancerArn: string;
  targetGroupArn: string;
}

export class ExplicitListener extends Construct {
  readonly listener: elbv2.CfnListener;

  constructor(scope: Construct, id: string, props: ExplicitListenerProps) {
    super(scope, id);

    // Forward incoming TCP traffic on port 80 to the target group.
    this.listener = new elbv2.CfnListener(this, "Listener", {
      loadBalancerArn: props.loadBalancerArn,
      port: 80,
      protocol: "TCP",
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: props.targetGroupArn,
        },
      ],
    });
  }
}
