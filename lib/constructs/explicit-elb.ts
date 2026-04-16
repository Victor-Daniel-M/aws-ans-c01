import { Construct } from "constructs";
import { ExplicitListener } from "./explicit-listener";
import { ExplicitNlb } from "./explicit-nlb";
import { ExplicitTargetGroup } from "./explicit-target-group";

export interface ExplicitElbProps {
  prefix: string;
  subnetIds: string[];
  vpcId: string;
  enableListener?: boolean;
}

export class ExplicitElb extends Construct {
  readonly loadBalancer: ExplicitNlb;
  readonly targetGroup: ExplicitTargetGroup;
  readonly listener?: ExplicitListener;

  constructor(scope: Construct, id: string, props: ExplicitElbProps) {
    super(scope, id);

    this.loadBalancer = new ExplicitNlb(this, "ExplicitNlb", {
      prefix: props.prefix,
      subnetIds: props.subnetIds,
    });

    this.targetGroup = new ExplicitTargetGroup(this, "ExplicitTargetGroup", {
      prefix: props.prefix,
      vpcId: props.vpcId,
    });

    if (props.enableListener) {
      this.listener = new ExplicitListener(this, "ExplicitListener", {
        loadBalancerArn: this.loadBalancer.loadBalancerArn,
        targetGroupArn: this.targetGroup.targetGroupArn,
      });
    }
  }
}
