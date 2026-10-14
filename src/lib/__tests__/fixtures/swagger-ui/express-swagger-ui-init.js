/* eslint-disable */
window.onload = function() {
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "customOptions": {},
  "swaggerUrl": "/api/v1/openapi.yaml"
};
  url = options.swaggerUrl || url
  var ui = SwaggerUIBundle({ url: url, dom_id: '#swagger-ui' })
};
