import { CfnOutput, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OUTPUT_IDS } from "../constants/output-ids";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitClusterProps {
  prefix: string;
}

export class ExplicitCluster extends Construct {
  readonly cluster: ecs.CfnCluster;
  readonly clusterName: string;

  constructor(scope: Construct, id: string, props: ExplicitClusterProps) {
    super(scope, id);

    this.clusterName = `${props.prefix}-cluster`;

    this.cluster = new ecs.CfnCluster(this, RESOURCE_IDS.CLUSTER, {
      clusterName: this.clusterName,
      clusterSettings: [
        {
          name: "containerInsights",
          value: "disabled",
        },
      ],
    });

    new CfnOutput(this, OUTPUT_IDS.CLUSTER_NAME, {
      exportName: `${props.prefix}-ClusterName`,
      value: this.cluster.clusterName ?? this.clusterName,
    });
  }
}
