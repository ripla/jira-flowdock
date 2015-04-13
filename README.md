Simple integration between JIRA and Flowdock. Implemented with NodeJS, this mediator relies on JIRA webhooks and the Flowdock API to send issue updates to your flow inbox.

##Usage

1. Create a Flowdock application and generate a Flow token. [Instructions in the Flowdock guide](https://www.flowdock.com/api/integration-guide)
2. Start the provided server.js, with e.g. forever

  forever start -l forever.log -o out.log -e err.log -a server.js

3. Configure [JIRA webhooks](https://confluence.atlassian.com/display/JIRA/Managing+Webhooks) to send created, update and / or transition events as needed. Append query parameters flow_token and jira_baseurl.
