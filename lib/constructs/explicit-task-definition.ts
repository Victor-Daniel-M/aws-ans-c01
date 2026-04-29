import { CfnOutput, aws_ecs as ecs } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OUTPUT_IDS } from "../constants/output-ids";
import { RESOURCE_IDS } from "../constants/resource-ids";

export interface ExplicitTaskDefinitionProps {
  prefix: string;
}

export class ExplicitTaskDefinition extends Construct {
  readonly taskDefinition: ecs.CfnTaskDefinition;
  readonly family: string;
  readonly containerName: string;
  readonly containerPort: number;

  constructor(scope: Construct, id: string, props: ExplicitTaskDefinitionProps) {
    super(scope, id);

    this.family = `${props.prefix}-task`;
    this.containerName = `${props.prefix}-tcp-app`;
    this.containerPort = 8080;

    // Run a tiny TCP app inside a public Node image so the local lab has
    // something concrete for the ECS service and target group to point at.
    this.taskDefinition = new ecs.CfnTaskDefinition(this, RESOURCE_IDS.TASK_DEFINITION, {
      family: this.family,
      cpu: "256",
      memory: "512",
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      containerDefinitions: [
        {
          name: this.containerName,
          image: "public.ecr.aws/docker/library/node:20-alpine",
          essential: true,
          portMappings: [
            {
              containerPort: this.containerPort,
              hostPort: this.containerPort,
              protocol: "tcp",
            },
          ],
          command: [
            "node",
            "-e",
            "const net=require('net');const server=net.createServer((socket)=>{socket.write('HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\nContent-Length: 16\\r\\nConnection: close\\r\\n\\r\\nansc01lab-tcp\\n');socket.end();});server.listen(8080,'0.0.0.0');setInterval(()=>{},1<<30);",
          ],
        },
      ],
    });

    new CfnOutput(this, OUTPUT_IDS.TASK_DEFINITION_FAMILY, {
      exportName: `${props.prefix}-TaskDefinitionFamily`,
      value: this.family,
    });
  }
}
