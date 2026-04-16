import { CfnOutput, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitClusterProps {
  prefix: string;
}

export class ExplicitCluster extends Construct {
  readonly cluster: ecs.CfnCluster;
  readonly clusterName: string;

  constructor(scope: Construct, id: string, props: ExplicitClusterProps) {
    super(scope, id);

    this.clusterName = `${props.prefix}-cluster`;

    this.cluster = new ecs.CfnCluster(this, "Cluster", {
      clusterName: this.clusterName,
      clusterSettings: [
        {
          name: "containerInsights",
          value: "disabled",
        },
      ],
    });

    new CfnOutput(this, "ClusterName", {
      exportName: `${props.prefix}-ClusterName`,
      value: this.cluster.clusterName ?? this.clusterName,
    });
  }
}
