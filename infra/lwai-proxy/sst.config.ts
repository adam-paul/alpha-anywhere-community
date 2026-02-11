/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'lwai-proxy',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: {
          region: 'us-east-1'
        }
      }
    };
  },
  async run() {
    // Secret for API key authentication
    const apiKey = new sst.Secret('ApiKey');

    // Lambda function for gating queries
    const api = new sst.aws.ApiGatewayV2('LwaiApi');

    api.route('GET /gating', {
      handler: 'packages/functions/src/gating.handler',
      timeout: '30 seconds',
      memory: '256 MB',
      environment: {
        COACHBOT_ROLE_ARN:
          'arn:aws:iam::515451715086:role/alphacoachbot-production-alphacoachbotproductiona-15USUMI5JRGHW',
        ATHENA_DATABASE: 'coachbot-data-feed',
        ATHENA_OUTPUT: 's3://alphalearn-athena-query-results/',
        WEEKLY_THRESHOLD: '300'
      },
      link: [apiKey],
      permissions: [
        {
          actions: ['sts:AssumeRole'],
          resources: [
            'arn:aws:iam::515451715086:role/alphacoachbot-production-alphacoachbotproductiona-15USUMI5JRGHW'
          ]
        }
      ]
    });

    return {
      api: api.url
    };
  }
});
