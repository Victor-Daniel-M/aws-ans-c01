import { Construct } from "constructs";
import { ExplicitCluster } from "./explicit-cluster";
import { ExplicitEcr } from "./explicit-ecr";

export interface ExplicitEcsProps {
  prefix: string;
}

export class ExplicitEcs extends Construct {
  readonly cluster: ExplicitCluster;
  readonly repository: ExplicitEcr;

  constructor(scope: Construct, id: string, props: ExplicitEcsProps) {
    super(scope, id);

    this.cluster = new ExplicitCluster(this, "ExplicitCluster", {
      prefix: props.prefix,
    });

    this.repository = new ExplicitEcr(this, "ExplicitEcr", {
      prefix: props.prefix,
    });
  }
}
