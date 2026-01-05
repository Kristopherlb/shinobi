/**
 * Hello World API Lambda Handler
 * 
 * Simple HTTP API handler for testing the Shinobi platform deployment.
 */

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Hello from hello-world-api!',
      service: 'hello-world-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requestId: event.requestContext?.requestId || 'unknown',
      method: event.httpMethod || event.requestContext?.http?.method || 'GET',
      path: event.path || event.requestContext?.path || '/',
      environment: process.env.ENVIRONMENT || 'dev'
    })
  };
};

