export function createRequest({ body, query, metadata }) {
  this.body = { ...body };
  this.query = { ...query };
  this.metadata = { ...metadata };
}

export function createResponse() {
  let responseStatus = null;
  let responsePayload = null;

  this.status = (code) => {
    responseStatus = code;
    return this;
  };

  this.send = (payload) => {
    responsePayload = payload;
    return this;
  };

  this.getStatus = () => responseStatus;
  this.getPayload = () => responsePayload;
}
