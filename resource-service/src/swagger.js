const swaggerJsDoc = require('swagger-jsdoc');


const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API",
      version: "1.0.0",
      description: "API documentation example"
    }
  },
  
  apis: ["./src/*.js"]
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
