// Page metadata for the Petshop example; tools/gen-examples.mjs merges it
// with the source files listed in `files`.
const API_SA = 'petshop-api@$PROJECT_ID.iam.gserviceaccount.com';
const WORKER_SA = 'petshop-worker@$PROJECT_ID.iam.gserviceaccount.com';
const GW_SA = 'petshop-gateway@$PROJECT_ID.iam.gserviceaccount.com';
const GENAI_ENV = 'GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_ENTERPRISE=True';

export default {
  id: 'petshop',
  title: 'Petshop (Functions + Firestore)',
  icon: 'paw',
  summary: 'Serverless adoption API: Cloud Functions, Firestore, API Gateway, Gemini vision.',
  description: 'An adoption shop built from two 2nd-gen Cloud Functions written in Node.js. `petsApi` serves the REST API from Firestore behind API Gateway, which requires an API key. When a pet is added with a photo in Cloud Storage, Gemini looks at the picture and writes an adoption profile (description, breed guess, temperament), and rejects photos that do not show an animal. Adoptions are published to Pub/Sub, and the `onAdoption` worker function records them and sends the notification.',
  useCases: [
    'Public APIs with API keys and quotas without running servers',
    'Event-driven back-office work via Pub/Sub-triggered functions',
    'Using Gemini vision to enrich user-submitted photos',
  ],
  covers: [
    ['start', 'config'],
    ['storage', 'firestore'], ['storage', 'buckets'],
    ['compute', 'functions'],
    ['iam', 'service-accounts'], ['iam', 'policies'],
    ['data', 'pubsub'],
    ['apis', 'services'], ['apis', 'gateway'], ['apis', 'api-keys'],
    ['gemini', 'setup'], ['gemini', 'vision'],
  ],
  flow: [
    ['client + API key', 'API Gateway', 'Function: petsApi', 'Firestore: pets'],
    ['Function: petsApi', 'Gemini (photo → profile)', 'Cloud Storage: photos'],
    ['Function: petsApi', 'Pub/Sub: adoptions', 'Function: onAdoption'],
  ],
  files: [
    { path: 'functions/index.js', lang: 'javascript', open: true },
    { path: 'functions/package.json', lang: 'json' },
    { path: 'openapi.yaml', lang: 'yaml' },
  ],
  sections: [
    {
      title: '1. Project & APIs',
      cmds: [
        { d: 'Variables and a dedicated configuration', c: 'export PROJECT_ID=my-petshop REGION=europe-west1\ngcloud config configurations create petshop\ngcloud config set project $PROJECT_ID\ngcloud config set functions/region $REGION' },
        { d: 'Enable APIs (Functions 2nd gen builds with Cloud Build and runs on Cloud Run)', c: 'gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \\\n  artifactregistry.googleapis.com eventarc.googleapis.com pubsub.googleapis.com firestore.googleapis.com \\\n  storage.googleapis.com aiplatform.googleapis.com apigateway.googleapis.com \\\n  servicemanagement.googleapis.com servicecontrol.googleapis.com apikeys.googleapis.com' },
      ],
    },
    {
      title: '2. IAM: one service account per component',
      cmds: [
        { d: 'API function, worker function, and the gateway', c: 'gcloud iam service-accounts create petshop-api --display-name="Petshop API function"\ngcloud iam service-accounts create petshop-worker --display-name="Petshop adoption worker"\ngcloud iam service-accounts create petshop-gateway --display-name="Petshop API Gateway"' },
        { d: 'API: read/write Firestore, publish adoptions, call Gemini', c: `for role in roles/datastore.user roles/pubsub.publisher roles/aiplatform.user; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${API_SA} --role=$role --condition=None\ndone` },
        { d: 'Worker: write Firestore only', c: `gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${WORKER_SA} --role=roles/datastore.user --condition=None` },
      ],
    },
    {
      title: '3. Storage: Firestore + photo bucket',
      cmds: [
        { d: 'Firestore database (Native mode) in the same region', c: 'gcloud firestore databases create --location=$REGION --type=firestore-native' },
        { d: 'Composite index for "available pets of a species, newest first"', c: 'gcloud firestore indexes composite create --collection-group=pets \\\n  --field-config=field-path=status,order=ascending \\\n  --field-config=field-path=species,order=ascending \\\n  --field-config=field-path=createdAt,order=descending' },
        { d: 'Daily backups kept for a week', c: 'gcloud firestore backups schedules create --database="(default)" --recurrence=daily --retention=7d' },
        { d: 'Private bucket for pet photos', c: 'gcloud storage buckets create gs://$PROJECT_ID-pet-photos --location=$REGION --uniform-bucket-level-access --public-access-prevention' },
        { d: 'The API and the Agent Platform service agent (which fetches gs:// images for Gemini) can read photos', c: `gcloud beta services identity create --service=aiplatform.googleapis.com\nPROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")\nfor m in serviceAccount:${API_SA} serviceAccount:service-$PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com; do\n  gcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-pet-photos --member=$m --role=roles/storage.objectViewer\ndone` },
      ],
    },
    {
      title: '4. Deploy the functions',
      note: 'Run from the example root; `--source=functions` uploads the folder with `index.js` and `package.json`.',
      cmds: [
        { d: 'Adoption events topic', c: 'gcloud pubsub topics create adoptions' },
        { d: 'HTTP API function (private; only the gateway may call it)', c: `gcloud functions deploy petsApi --gen2 --runtime=nodejs22 --region=$REGION --source=functions \\\n  --entry-point=petsApi --trigger-http --no-allow-unauthenticated --service-account=${API_SA} \\\n  --memory=512Mi --timeout=60s --set-env-vars=${GENAI_ENV},ADOPTIONS_TOPIC=adoptions` },
        { d: 'Pub/Sub-triggered worker (Eventarc invokes it as the worker SA)', c: `gcloud functions deploy onAdoption --gen2 --runtime=nodejs22 --region=$REGION --source=functions \\\n  --entry-point=onAdoption --trigger-topic=adoptions --service-account=${WORKER_SA} \\\n  --trigger-service-account=${WORKER_SA}\ngcloud functions add-invoker-policy-binding onAdoption --region=$REGION --member=serviceAccount:${WORKER_SA}` },
      ],
    },
    {
      title: '5. API Gateway + API key',
      cmds: [
        { d: 'Let the gateway SA invoke the API function', c: `gcloud functions add-invoker-policy-binding petsApi --region=$REGION --member=serviceAccount:${GW_SA}` },
        { d: 'Render the spec with the real function URL', c: 'BACKEND_URL=$(gcloud functions describe petsApi --region=$REGION --v2 --format="value(serviceConfig.uri)")\nsed "s#BACKEND_URL#$BACKEND_URL#" openapi.yaml > openapi.gen.yaml' },
        { d: 'API, config and gateway', c: `gcloud api-gateway apis create petshop-api\ngcloud api-gateway api-configs create v1 --api=petshop-api --openapi-spec=openapi.gen.yaml \\\n  --backend-auth-service-account=${GW_SA}\ngcloud api-gateway gateways create petshop-gw --api=petshop-api --api-config=v1 --location=$REGION` },
        { d: 'Enable the generated managed service and create a key restricted to it', c: 'MANAGED=$(gcloud api-gateway apis describe petshop-api --format="value(managedService)")\ngcloud services enable $MANAGED\ngcloud services api-keys create --display-name=petshop-web --api-target=service=$MANAGED' },
        { d: 'Gateway host and key string', c: 'HOST=$(gcloud api-gateway gateways describe petshop-gw --location=$REGION --format="value(defaultHostname)")\nKEY_NAME=$(gcloud services api-keys list --filter="displayName=petshop-web" --format="value(name)")\nAPI_KEY=$(gcloud services api-keys get-key-string $KEY_NAME --format="value(keyString)")' },
      ],
    },
    {
      title: '6. Test',
      cmds: [
        { d: 'Upload a photo', c: 'gcloud storage cp ./rex.jpg gs://$PROJECT_ID-pet-photos/rex.jpg' },
        { d: 'Add the pet; Gemini writes the profile from the photo', c: 'curl -s -X POST "https://$HOST/pets" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \\\n  -d "{\\"name\\":\\"Rex\\",\\"species\\":\\"dog\\",\\"age\\":3,\\"photo\\":\\"gs://$PROJECT_ID-pet-photos/rex.jpg\\"}" | jq .' },
        { d: 'List available dogs (uses the composite index)', c: 'curl -s "https://$HOST/pets?species=dog" -H "x-api-key: $API_KEY" | jq \'.[] | {id, name, breedGuess, description}\'' },
        { d: 'Adopt, then check the worker ran', c: 'PET_ID=$(curl -s "https://$HOST/pets?species=dog" -H "x-api-key: $API_KEY" | jq -r \'.[0].id\')\ncurl -s -X POST "https://$HOST/pets/$PET_ID/adopt" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" -d \'{"adopter":"ada@example.com"}\'\ngcloud functions logs read onAdoption --region=$REGION --limit=10' },
        { d: 'Without a key the gateway rejects the call (401)', c: 'curl -s -o /dev/null -w "%{http_code}\\n" "https://$HOST/pets"' },
      ],
    },
    {
      title: '7. Cleanup',
      cmds: [
        { d: 'Delete everything this example created', c: 'gcloud api-gateway gateways delete petshop-gw --location=$REGION --quiet\ngcloud api-gateway api-configs delete v1 --api=petshop-api --quiet\ngcloud api-gateway apis delete petshop-api --quiet\ngcloud services api-keys delete $KEY_NAME --quiet\ngcloud functions delete petsApi --region=$REGION --quiet\ngcloud functions delete onAdoption --region=$REGION --quiet\ngcloud pubsub topics delete adoptions --quiet\ngcloud storage rm --recursive gs://$PROJECT_ID-pet-photos\nfor sa in petshop-api petshop-worker petshop-gateway; do gcloud iam service-accounts delete $sa@$PROJECT_ID.iam.gserviceaccount.com --quiet; done' },
      ],
    },
  ],
};
