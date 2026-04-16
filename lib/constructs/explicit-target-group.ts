import { CfnOutput, aws_elasticloadbalancingv2 as elbv2 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitTargetGroupProps {
  prefix: string;
  vpcId: string;
}

export class ExplicitTargetGroup extends Construct {
  readonly targetGroup: elbv2.CfnTargetGroup;
  readonly targetGroupName: string;

  constructor(scope: Construct, id: string, props: ExplicitTargetGroupProps) {
    super(scope, id);

    this.targetGroupName = `${props.prefix}-tg`;

    this.targetGroup = new elbv2.CfnTargetGroup(this, "TargetGroup", {
      name: this.targetGroupName,
      port: 80,
      protocol: "TCP",
      targetType: "ip",
      vpcId: props.vpcId,
    });

    new CfnOutput(this, "TargetGroupName", {
      exportName: `${props.prefix}-TargetGroupName`,
      value: this.targetGroupName,
    });
  }
}
