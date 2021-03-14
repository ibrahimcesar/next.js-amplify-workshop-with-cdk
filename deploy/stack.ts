import * as cdk from "@aws-cdk/core";
import { NextJSLambdaEdge } from "@sls-next/cdk-construct";
import { Runtime } from "@aws-cdk/aws-lambda";

export class NextStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: "NextBlog", props: cdk.StackProps ) {
    super(scope, id, props);
    new NextJSLambdaEdge(this, "NextBlog", {
      serverlessBuildOutDir: "./build",
      cachePolicyName: {
        staticsCache: `StaticsCache-${id}`,
        imageCache: `ImageCache-${id}`,
        lambdaCache: `LambdaCache-${id}`
      },
      description: `${id} : Functions Lambda@Edge for the application`,
      memory: 1024,
      name: {
        imageLambda: `ImageLambda-${id}`,
        defaultLambda: `DefaultLambda-${id}`,
        apiLambda: `ApiLambda-${id}`
      },
      runtime: Runtime.NODEJS_12_X,
      withLogging: true, 
    });
  }
}