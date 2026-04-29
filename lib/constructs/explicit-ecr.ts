import { CfnOutput, aws_ecr as ecr } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OUTPUT_IDS } from "../constants/output-ids";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitEcrProps {
  prefix: string;
}

export class ExplicitEcr extends Construct {
  readonly repository: ecr.Repository;
  readonly repositoryName: string;

  constructor(scope: Construct, id: string, props: ExplicitEcrProps) {
    super(scope, id);

    this.repositoryName = `${props.prefix}-repo`;

    this.repository = new ecr.Repository(this, RESOURCE_IDS.REPOSITORY, {
      repositoryName: this.repositoryName,
      imageScanOnPush: false,
    });

    new CfnOutput(this, OUTPUT_IDS.REPOSITORY_NAME, {
      exportName: `${props.prefix}-RepositoryName`,
      value: this.repository.repositoryName,
    });
  }
}
