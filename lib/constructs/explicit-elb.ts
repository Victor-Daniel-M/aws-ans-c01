import { Construct } from "constructs";
import { CONSTRUCT_IDS } from "../constants/construct-ids";
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

    this.loadBalancer = new ExplicitNlb(this, CONSTRUCT_IDS.EXPLICIT_NLB, {
      prefix: props.prefix,
      subnetIds: props.subnetIds,
    });

    this.targetGroup = new ExplicitTargetGroup(this, CONSTRUCT_IDS.EXPLICIT_TARGET_GROUP, {
      prefix: props.prefix,
      vpcId: props.vpcId,
    });

    if (props.enableListener) {
      this.listener = new ExplicitListener(this, CONSTRUCT_IDS.EXPLICIT_LISTENER, {
        loadBalancerArn: this.loadBalancer.loadBalancerArn,
        targetGroupArn: this.targetGroup.targetGroupArn,
      });
    }
  }
}
