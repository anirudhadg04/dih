declare module "serverless-http" {
  type Handler = (event: unknown, context: unknown) => Promise<unknown>;
  type ServerlessHttp = (app: unknown) => Handler;
  const serverlessHttp: ServerlessHttp;
  export default serverlessHttp;
}