# Full Stack Cloud SSR with Next.js, Tailwin, and AWS CDK

## First things first 🌟

Most of the work here was created by [Nader Dabit](https://twitter.com/dabit3) and you definitely should checkout the [video for this workshop](https://www.youtube.com/watch?v=13nYLmjZ0Ys) and the [repo with a step by step guide](https://github.com/dabit3/next.js-amplify-workshop). You'll learn a lot! 

I highly recommend [follow along the video](https://www.youtube.com/watch?v=13nYLmjZ0Ys) and [checkout the repository with all the code and a very complete descriptions step by step](https://github.com/dabit3/next.js-amplify-workshop), introducing to Amplify, NextJS and several other products/ tools / managed services like AppSync and Cognito.

Stop at [Deployment with Serverless Framework](https://github.com/dabit3/next.js-amplify-workshop#deployment-with-serverless-framework). That's where I'll picked up to show how make this deploy "AWS native" with [AWS CDK](https://aws.amazon.com/pt/cdk/). 

Also, we'll change the generation process to Server Side Rendering (SSR) because I failed to make Incremental Static Regeneration  (ISR) work (Pull Requests will be welcomed). In the file `pages/posts/[id].js` replace the code with `getServerSideProps`, so it should look like this:

```javascript
// pages/posts/[id].js
import { API, Storage } from 'aws-amplify'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import { listPosts, getPost } from '../../graphql/queries'

export default function Post({ post }) {

  const [coverImage, setCoverImage] = useState(null)
  useEffect(() => {
    updateCoverImage()
  }, [])
  async function updateCoverImage() {
    if (post?.coverImage) {
      const imageKey = await Storage.get(post.coverImage)
      setCoverImage(imageKey)
    }
  }

  const router = useRouter()
  if (router.isFallback) {
    return <div>Loading...</div>
  }
  return (
    <div>
      <h1 className="text-5xl mt-4 font-semibold tracking-wide">{post.title}</h1>
      {
        coverImage && <img src={coverImage} className="mt-4" />
      }
      <p className="text-sm font-light my-4">by {post.username}</p>
      <div className="mt-8">
        <ReactMarkdown className='prose' children={post.content} />
      </div>
    </div>
  )
}

// This is what we are change, removing getStaticPaths and getStaticProps:
export async function getServerSideProps({ params }) {
  const { id } = params
  const postData = await API.graphql({
    query: getPost, variables: { id }
  })
  return {
    props: {
      post: postData.data.getPost
    }
  }
}

```

## Deployment with the Serverless NextJS CDK Constructor ✨

To deploy to AWS with the [Serverless NextJS CDK Constructor](https://serverless-nextjs.com/docs/cdkconstruct/) we’ll need to set up first some things. First you will need to install the CDK CLI and then bootstrap the CDK in your account.

Then we’ll install some dev dependencies, only used in your machine to generate and deploy the assets.

```bash

npm install --save-dev @aws-cdk/core @sls-next/lambda-at-edge @sls-next/cdk-construct @aws-cdk/aws-lambda

```

* [@aws-cdk/core](https://www.npmjs.com/package/@aws-cdk/core): This library includes the basic building blocks of the AWS Cloud Development Kit (AWS CDK). It defines the core classes that are used in the rest of the AWS Construct Library.

* [@aws-cdk/aws-lambda](https://www.npmjs.com/package/@aws-cdk/aws-lambda) This construct library allows you to define AWS Lambda Functions.

* [@sls-next/cdk-construct](https://www.npmjs.com/package/@sls-next/cdk-construct) It is very important you have on your package the [@sls-next/serverless-component@1.19.0-alpha.37](https://github.com/serverless-nextjs/serverless-next.js/releases/tag/%40sls-next%2Fserverless-component%401.19.0-alpha.37) version where the options to name the cache policies where added. If is not the above or greater, then please editthe version in your package and run `npm install`

* [@sls-next/lambda-at-edge](https://www.npmjs.com/package/@sls-next/lambda-at-edge) AWS Lambda@Edge library to help you deploy serverless next.js applications to CloudFront

Then you’ll need to create a `tsconfig.json` in your project because we’ll use TypeScript (yes, in a JavaScript project, but only to allow the usage in the folder deploy that we’ll create.

Your `tsconfig.json` should look like this:

```json
{
  "compilerOptions": {
    "alwaysStrict": true,
    "downlevelIteration": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSourceMap": true,
    "lib": [
      "es2020"
    ],
    "moduleResolution": "node",
    "noEmitOnError": true,
    "strict": true,
    "target": "ES6",
    "skipLibCheck": true,
    "noEmit": true,
    "module": "commonjs",
    "isolatedModules": true,
    "allowJs": true,
    "resolveJsonModule": true,
    "jsx": "preserve"
  },
  "exclude": [
    "node_modules"
  ],
  "include": [
    "deploy"
  ]
}
```

Not all of this configuration is really needed, but I basically use a boilerplate for all my projects and simply decided to not cherry pick and test every option. Then we need to create special file to CDK pickup about our stack that must be named`cdk.json`:

```json
{
  "app": "npx ts-node deploy/bin.ts"
}
```

When later we use `cdk deploy` it will download and run the ts-node utility to run the file `bin.ts` without the hassle of setup compiling _ts_ to _js_.

Note that before `bin.ts`, this file I mentioned is inside a folder named `deploy`. But you could name whatever you want, just remember to change in the `cdk.json`.

This folder is where all logic of our CDK Constructor will live. Create the folder `deploy`. We will create two files, `bin.ts` and `stack.ts`. I make a little change to improve my workflow but the official page has an [outstanding example of a minimal setup](https://serverless-nextjs.com/docs/cdkconstruct/).

```typescript
// deploy/bin.ts
  constructor(scope: cdk.Construct, id: "NextBlog", props: cdk.StackProps ) {
    super(scope, id, props);
    new NextJSLambdaEdge(this, "NextBlog", {
      serverlessBuildOutDir: "./build",
      description: `${id} : Functions Lambda@Edge for the application`,
      cachePolicyName: {
        staticsCache: `StaticsCache-${id}`,
        imageCache: `ImageCache-${id}`,
        lambdaCache: `LambdaCache-${id}`
      },
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
```

```typescript
// deploy/stack.ts
import * as cdk from “@aws-cdk/core”;
import { Duration } from “@aws-cdk/core”;
import { NextJSLambdaEdge } from “@sls-next/cdk-construct”;
import { Runtime } from “@aws-cdk/aws-lambda”;

export class NextStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: “NextBlog”, props: cdk.StackProps ) {
    super(scope, id, props);
    new NextJSLambdaEdge(this, “NextBlog”, {
      serverlessBuildOutDir: “./build”,
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
      timeout: Duration.seconds(30),
      withLogging: true,
    });
  }
}
```

As you can see above, I use the variable id from the constructor in several places. I make this way in order for each stack to have a unique name. Before, without those options, if you wanted to deploy a second application probably your deploy would fail because the names of the functions and for the policy caches would collide. This way we keep separated. I other fields to tweak the lambda.

Run `cdk deploy` at the root of your folder, avail the artefacts and services created. Once you accept you will see the logs of CloudFormation until the creation is complete and your terminal should display this:

```bash
[100%] success: Published
********
NextBlog: creating CloudFormation changeset...

[████████████████████████████████████████████████████▏·····] (18/20)

 ✅  NextBlog

Stack ARN:
*******

```

If not, something is wrong somewhere. If the code even uploaded your assets, the problem is in the application / settings and if you be one of us that faces the “RED ROLLBACK OF THE SOUL” from CloudFormation that has very little information about the error, sometimes just where. But you can always checkup the CloudTrail in you account and look out for the errors and you’ll have a clear picture of what is going wrong.

You can open an issue as you wish. I may never answear if I wish – MIT is "as is".

### Important Notes 📝

* Even the runtime Node_14_X, at the time this runtime was not available to Lambda@Edge where your lambdas will be built.

* If you pay attention the `serverlessBuildOutDir` prop points to `build`. The default for NextJS is to build in `.next`. But you don’t need to change, in fact, did not change. The Construct will take care of create a production optimized bundle in the folder.

* **Why waste so much time?!?!**, the other solution take 2 lines and zero-config. Yeah, but in my real use cases our applications need to be in TypeScript so have our IaC in CDK will keep the cognitive load at the same level and we’ll not need to handle specific configurations. Also, this app could be only one piece of several other constructors and it will play little nice with the same tooling. Also no YAML chaos magic and type safety.

* If you need to deploy over one stack, you’ll need to use the options `cachePolicyName` and `name`, but you can call whatever you want. just try to have a pattern, always help later to gather data, debugging and stuff. And remember that must be unique!

* Remember that the time of the writing, this is an experimental feature, in alpha.

### See yourself

* 🖼️ [Live demo](https://d1zk2p0o1jgic1.cloudfront.net/) – Honestly I don’t know how much time I’ll keep online, since I can wake up tomorrow with gigas of porn in my S3 buckets, but I’ll give the trust that the Dev and the AWS Builders community inspires in me and that the very few people who’ll visit are nice people and we’ll leave the project clean.

* 🗄️ [Repo](https://github.com/ibrahimcesar/next.js-amplify-workshop-with-cdk) Yes, no linter, no rules. Proof of Concept should be quick and dirt (I mean in the code, just in the code!).

* ⚠️ To avoid any costs if you are just testing, remember to [remove all services](https://github.com/dabit3/next.js-amplify-workshop#removing-services).

### Extra points 💰

If you want to go a mile more, you can setup a npm script to deploy for you. You will need to install as dev dependencies:

```bash

npm install --save-dev aws-cdk typescript

```

* [aws-cdk](https://www.npmjs.com/package/aws-cdk) – The AWS CDK Toolkit provides the `cdk` command-line interface that can be used to work with AWS CDK applications.

* [typescript](https://www.npmjs.com/package/typescript) TypeScript itself need after the `aws-cdk` install.

With this you can edit your `package.json` on the `scripts` options:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "deploy": "cdk deploy --profile pessoal"
  }
```

So you’ll only need run the script `npm run deploy`, which helps to automatize pipelines and other uses.

In the example above the option `--profile` points my CDK to use a set of credentials I place in my machine with this label `pessoal` which is the same as `personal` in English, since this demo I’m creating in my spare time and for self improvement.

## Thanks!
[Nader Dabit](https://github.com/dabit3) and the [awesome and incredible AWS Amplify team](https://docs.amplify.aws/). I’m a huge fan of the work from [Nader Dabit](https://twitter.com/dabit3), which is the author of [Full Stack Serverless](https://www.amazon.com/Full-Stack-Serverless-Application-Development/dp/1492059897) – one concept I more and more identify myself.  
[Serverless Nextjs CDK construct](https://serverless-nextjs.com/docs/cdkconstruct/), in special [Henry Kirkness](https://github.com/kirkness) and 
[Daniel Phang](https://github.com/dphang) for all work at [this feature](https://github.com/serverless-nextjs/serverless-next.js/pull/878).
### MIT License
 
© Copyright 2021 [Ibrahim Cesar](https://ibrahimcesar.cloud)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
