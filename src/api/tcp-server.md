Minimal TCP app behavior used by the ECS task definition:

- listen on port 8080
- write a tiny HTTP 200 response body of `ansc01lab-tcp`
- close the socket

The CDK task definition currently embeds this logic inline with `node -e` to
avoid Docker asset/bootstrap complexity in the local lab.
