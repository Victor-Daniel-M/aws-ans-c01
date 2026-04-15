import { aws_ecr as ecr, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitEcsProps {
  clusterName: string;
  repositoryName: string;
}

export class ExplicitEcs extends Construct {
  readonly cluster: ecs.CfnCluster;
  readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ExplicitEcsProps) {
    super(scope, id);

    this.cluster = new ecs.CfnCluster(this, "Cluster", {
      clusterName: props.clusterName,
      clusterSettings: [
        {
          name: "containerInsights",
          value: "disabled",
        },
      ],
    });

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: props.repositoryName,
      imageScanOnPush: false,
    });
  }
}
