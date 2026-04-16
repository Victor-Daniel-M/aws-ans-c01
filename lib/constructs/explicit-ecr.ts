import { CfnOutput, aws_ecr as ecr } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface ExplicitEcrProps {
  prefix: string;
}

export class ExplicitEcr extends Construct {
  readonly repository: ecr.Repository;
  readonly repositoryName: string;

  constructor(scope: Construct, id: string, props: ExplicitEcrProps) {
    super(scope, id);

    this.repositoryName = `${props.prefix}-repo`;

    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: this.repositoryName,
      imageScanOnPush: false,
    });

    new CfnOutput(this, "RepositoryName", {
      exportName: `${props.prefix}-RepositoryName`,
      value: this.repository.repositoryName,
    });
  }
}
