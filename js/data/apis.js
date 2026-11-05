export default {
  id: 'apis',
  title: 'APIs & services',
  icon: 'plug',
  color: 'apis',
  description: 'Every Google Cloud product is an API that must be enabled per project. Manage those APIs, their keys and quotas, publish your own APIs through API Gateway, and call any Google API directly.',
  useCases: [
    'Enabling the APIs a new project needs',
    'Creating restricted API keys for browser / mobile apps',
    'Checking and raising quotas',
    'Calling REST APIs from scripts with gcloud tokens',
  ],
  subtopics: [
    {
      id: 'services',
      title: 'Enable & manage APIs',
      icon: 'toggle',
      summary: 'Enable, disable and list service APIs.',
      description: 'Use `gcloud services` to toggle APIs per project. Most "API not enabled" errors are fixed with a single `enable`.',
      useCases: ['Bootstrapping a new project', 'Auditing which APIs are on', 'Turning off unused APIs'],
      sections: [
        {
          title: 'Services',
          cmds: [
            { d: 'Enable one or more APIs', c: 'gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com' },
            { d: 'List enabled APIs', c: 'gcloud services list --enabled' },
            { d: 'Search available APIs', c: 'gcloud services list --available --filter="name:bigquery"' },
            { d: 'Disable an API', c: 'gcloud services disable translate.googleapis.com' },
            { d: 'Enable on another project', c: 'gcloud services enable compute.googleapis.com --project=PROJECT_ID' },
          ],
        },
        {
          title: 'Common API names',
          cmds: [
            { c: '# compute.googleapis.com          Compute Engine\n# run.googleapis.com              Cloud Run\n# cloudfunctions.googleapis.com   Cloud Functions\n# container.googleapis.com        GKE\n# artifactregistry.googleapis.com Artifact Registry\n# storage.googleapis.com          Cloud Storage\n# bigquery.googleapis.com         BigQuery\n# sqladmin.googleapis.com         Cloud SQL Admin\n# firestore.googleapis.com        Firestore\n# pubsub.googleapis.com           Pub/Sub\n# secretmanager.googleapis.com    Secret Manager\n# iam.googleapis.com              IAM\n# iamcredentials.googleapis.com   IAM credentials (impersonation)' },
          ],
        },
      ],
    },
    {
      id: 'api-keys',
      title: 'API keys',
      icon: 'apikey',
      summary: 'Create and restrict API keys.',
      description: 'API keys identify a project for APIs that allow unauthenticated access, such as Maps or Gemini. Always restrict keys to specific APIs and referrers/IPs.',
      useCases: ['Browser apps calling Maps / Places', 'Server-side keys restricted by IP', 'Rotating a leaked key'],
      sections: [
        {
          title: 'Keys',
          cmds: [
            { d: 'Create a key restricted to one API and web referrer', c: 'gcloud services api-keys create --display-name="web-maps" \\\n  --api-target=service=maps-backend.googleapis.com \\\n  --allowed-referrers="https://example.com/*"' },
            { d: 'Create a server key restricted by IP', c: 'gcloud services api-keys create --display-name="backend" --allowed-ips=203.0.113.10' },
            { d: 'List keys', c: 'gcloud services api-keys list' },
            { d: 'Show the key string', c: 'gcloud services api-keys get-key-string KEY_ID' },
            { d: 'Update restrictions', c: 'gcloud services api-keys update KEY_ID --api-target=service=translate.googleapis.com' },
            { d: 'Delete / undelete', c: 'gcloud services api-keys delete KEY_ID\ngcloud services api-keys undelete KEY_ID' },
          ],
        },
      ],
    },
    {
      id: 'quotas',
      title: 'Quotas',
      icon: 'gauge',
      summary: 'Inspect usage and request quota increases.',
      description: 'Quotas cap resource use per project/region (CPUs, IPs, requests/min). Check them before a launch and request increases ahead of time.',
      useCases: ['"Quota exceeded" errors when creating VMs', 'Capacity planning before a launch', 'Lowering a quota to cap costs'],
      sections: [
        {
          title: 'Inspect & request',
          cmds: [
            { d: 'Compute quotas for a region', c: 'gcloud compute regions describe europe-west1 --format="table(quotas.metric, quotas.usage, quotas.limit)" --flatten=quotas' },
            { d: 'Project-wide compute quotas', c: 'gcloud compute project-info describe --format="table(quotas.metric, quotas.usage, quotas.limit)" --flatten=quotas' },
            { d: 'Quota info for a service (Cloud Quotas API)', c: 'gcloud beta quotas info list --service=compute.googleapis.com --project=PROJECT_ID' },
            { d: 'Request an increase', c: 'gcloud beta quotas preferences create --service=compute.googleapis.com --quota-id=CPUS-per-project-region \\\n  --preferred-value=64 --dimensions=region=europe-west1 --project=PROJECT_ID --email=you@example.com' },
            { d: 'List pending requests', c: 'gcloud beta quotas preferences list --project=PROJECT_ID' },
          ],
        },
      ],
    },
    {
      id: 'gateway',
      title: 'API Gateway',
      icon: 'gateway',
      summary: 'Expose backends behind a managed, secured API.',
      description: 'Define an API with an OpenAPI spec and put it in front of Cloud Run, Functions or App Engine, with API key or JWT auth.',
      useCases: ['A single public API in front of several Cloud Run services', 'API-key protected partner APIs', 'JWT (Firebase/Auth0) validation at the edge'],
      sections: [
        {
          title: 'Deploy an API',
          cmds: [
            { d: 'Enable required APIs', c: 'gcloud services enable apigateway.googleapis.com servicemanagement.googleapis.com servicecontrol.googleapis.com' },
            { d: 'Create the API', c: 'gcloud api-gateway apis create my-api' },
            { d: 'Create a config from an OpenAPI spec', c: 'gcloud api-gateway api-configs create v1 --api=my-api --openapi-spec=openapi.yaml \\\n  --backend-auth-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Create the gateway', c: 'gcloud api-gateway gateways create my-gw --api=my-api --api-config=v1 --location=europe-west1' },
            { d: 'Get the gateway hostname', c: 'gcloud api-gateway gateways describe my-gw --location=europe-west1 --format="value(defaultHostname)"' },
            { d: 'Roll out a new config', c: 'gcloud api-gateway gateways update my-gw --api=my-api --api-config=v2 --location=europe-west1' },
          ],
        },
      ],
    },
    {
      id: 'rest',
      title: 'Calling REST APIs',
      icon: 'curl',
      summary: 'curl any Google API with gcloud tokens.',
      description: 'Every Google API is plain REST. Use a gcloud access token as a Bearer token to call endpoints that have no CLI command yet.',
      useCases: ['Trying an API before writing code', 'Features only in REST (preview APIs)', 'Shell scripts without client libraries'],
      sections: [
        {
          title: 'Examples',
          cmds: [
            { d: 'List buckets via the JSON API', c: 'curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \\\n  "https://storage.googleapis.com/storage/v1/b?project=PROJECT_ID"' },
            { d: 'Run a BigQuery query via REST', c: 'curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" \\\n  "https://bigquery.googleapis.com/bigquery/v2/projects/PROJECT_ID/queries" \\\n  -d \'{"query": "SELECT 1 AS x", "useLegacySql": false}\'' },
            { d: 'Set the quota project explicitly (user credentials)', c: 'curl -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: PROJECT_ID" \\\n  "https://cloudresourcemanager.googleapis.com/v3/projects/PROJECT_ID"' },
            { d: 'Call a private Cloud Run service', c: 'curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://SERVICE-xyz.a.run.app/health' },
            { d: 'See the REST calls a gcloud command makes', c: 'gcloud run services list --log-http 2>&1 | grep -E "^(uri|method):"' },
          ],
        },
        {
          title: 'Secret Manager (common in API workflows)',
          cmds: [
            { d: 'Create a secret from stdin', c: 'printf "s3cr3t" | gcloud secrets create api-key --data-file=-' },
            { d: 'Add a new version', c: 'printf "n3w" | gcloud secrets versions add api-key --data-file=-' },
            { d: 'Read the latest version', c: 'gcloud secrets versions access latest --secret=api-key' },
          ],
        },
      ],
    },
  ],
};
