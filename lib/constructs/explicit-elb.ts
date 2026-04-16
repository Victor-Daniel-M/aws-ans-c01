import { Construct } from "constructs";
import { ExplicitNlb } from "./explicit-nlb";
import { ExplicitTargetGroup } from "./explicit-target-group";

export interface ExplicitElbProps {
  prefix: string;
  subnetIds: string[];
  vpcId: string;
}

export class ExplicitElb extends Construct {
  readonly loadBalancer: ExplicitNlb;
  readonly targetGroup: ExplicitTargetGroup;

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
  }
}
