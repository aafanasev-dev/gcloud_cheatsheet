// Page metadata for the Image storage example; tools/gen-examples.mjs merges
// it with the source files listed in `files`.
const API_SA = 'imagestore-api@$PROJECT_ID.iam.gserviceaccount.com';
const PROC_SA = 'imagestore-processor@$PROJECT_ID.iam.gserviceaccount.com';
const TRIGGER_SA = 'imagestore-trigger@$PROJECT_ID.iam.gserviceaccount.com';
const DEPLOY_SA = 'imagestore-deployer@$PROJECT_ID.iam.gserviceaccount.com';
const AH = 'https://analyticshub.googleapis.com/v1/projects/$PROJECT_ID/locations/eu';

export default {
  id: 'imagestore',
  title: 'Image storage (Eventarc + Gemini)',
  icon: 'image',
  summary: 'Signed-URL uploads, event-driven processing, Gemini tagging, Analytics Hub sharing.',
  description: 'A photo library backend. Clients get a short-lived signed URL from the API and upload straight to Cloud Storage. Each new object fires an Eventarc event to the processor, which makes a thumbnail, asks Gemini for a caption, tags and a safety verdict, and can create a stylised variant with a Gemini image model. Metadata goes to Firestore for the app and to a BigQuery catalog, which is published to other teams through an Analytics Hub data exchange. GitHub Actions deploys both services with Workload Identity Federation, so no keys are stored.',
  useCases: [
    'User-generated photo uploads without proxying bytes through your servers',
    'Automatic captioning, tagging and moderation of images',
    'Sharing an analytics dataset with another team or partner without copying it',
    'Keyless CI/CD from GitHub to Google Cloud',
  ],
  covers: [
    ['start', 'config'], ['start', 'output'],
    ['storage', 'buckets'], ['storage', 'firestore'], ['storage', 'bigquery'],
    ['compute', 'cloudrun'],
    ['iam', 'service-accounts'], ['iam', 'impersonation'], ['iam', 'wif'], ['iam', 'policies'],
    ['data', 'analytics-hub'],
    ['apis', 'services'], ['apis', 'quotas'], ['apis', 'rest'],
    ['gemini', 'vision'], ['gemini', 'imagegen'], ['gemini', 'python-sdk'],
  ],
  flow: [
    ['client', 'Cloud Run: imagestore-api', 'signed PUT URL', 'Cloud Storage: uploads'],
    ['Cloud Storage: uploads', 'Eventarc (object finalized)', 'Cloud Run: imagestore-processor', 'Gemini (caption, tags, variant)'],
    ['Cloud Run: imagestore-processor', 'Firestore + Cloud Storage: thumbs', 'BigQuery catalog', 'Analytics Hub listing'],
  ],
  files: [
    { path: 'api/main.py', lang: 'python', open: true },
    { path: 'processor/main.py', lang: 'python', open: true },
    { path: 'api/requirements.txt', lang: 'text' },
    { path: 'processor/requirements.txt', lang: 'text' },
    { path: 'processor/Dockerfile', lang: 'dockerfile' },
    { path: 'catalog_schema.json', lang: 'json' },
    { path: 'cors.json', lang: 'json' },
    { path: 'lifecycle.json', lang: 'json' },
    { path: '.github/workflows/deploy.yml', lang: 'yaml' },
  ],
  sections: [
    {
      title: '1. Project & APIs',
      note: '`api/Dockerfile` is identical to `processor/Dockerfile`. Run the commands from the example root.',
      cmds: [
        { d: 'Variables and configuration', c: 'export PROJECT_ID=my-imagestore REGION=europe-west1\ngcloud config configurations create imagestore\ngcloud config set project $PROJECT_ID\ngcloud config set run/region $REGION\nPROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")' },
        { d: 'Enable APIs', c: 'gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \\\n  eventarc.googleapis.com pubsub.googleapis.com storage.googleapis.com firestore.googleapis.com \\\n  bigquery.googleapis.com analyticshub.googleapis.com aiplatform.googleapis.com \\\n  iamcredentials.googleapis.com sts.googleapis.com' },
        { d: 'Check Gemini quota before bulk processing', c: 'gcloud beta quotas info list --service=aiplatform.googleapis.com --project=$PROJECT_ID --filter="quotaId~generate" --format="table(quotaId, dimensionsInfos[0].details.value)"' },
      ],
    },
    {
      title: '2. Storage: buckets, Firestore, BigQuery',
      cmds: [
        { d: 'Uploads bucket (private, CORS for browser PUTs, lifecycle tiers) and a thumbnails bucket', c: 'gcloud storage buckets create gs://$PROJECT_ID-uploads --location=$REGION --uniform-bucket-level-access --public-access-prevention\ngcloud storage buckets update gs://$PROJECT_ID-uploads --cors-file=cors.json --lifecycle-file=lifecycle.json\ngcloud storage buckets create gs://$PROJECT_ID-thumbs --location=$REGION --uniform-bucket-level-access --public-access-prevention' },
        { d: 'Firestore + indexes the API queries need', c: 'gcloud firestore databases create --location=$REGION --type=firestore-native\ngcloud firestore indexes composite create --collection-group=images \\\n  --field-config=field-path=status,order=ascending --field-config=field-path=created_at,order=descending\ngcloud firestore indexes composite create --collection-group=images --field-config=field-path=status,order=ascending \\\n  --field-config=field-path=tags,array-config=contains --field-config=field-path=created_at,order=descending' },
        { d: 'BigQuery catalog (EU), partitioned by processing day', c: 'bq --location=EU mk --dataset --description="Image catalog" $PROJECT_ID:imagestore\nbq mk --table --time_partitioning_field=processed_at --schema=catalog_schema.json $PROJECT_ID:imagestore.images' },
      ],
    },
    {
      title: '3. IAM',
      cmds: [
        { d: 'Service accounts: API, processor, Eventarc trigger, CI deployer', c: 'for sa in imagestore-api imagestore-processor imagestore-trigger imagestore-deployer; do\n  gcloud iam service-accounts create $sa\ndone' },
        { d: 'API: Firestore, create objects in uploads, read thumbs', c: `gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${API_SA} --role=roles/datastore.user --condition=None\ngcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-uploads --member=serviceAccount:${API_SA} --role=roles/storage.objectUser\ngcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-thumbs --member=serviceAccount:${API_SA} --role=roles/storage.objectUser` },
        { d: 'Signed URLs without keys: the API SA may sign blobs as itself', c: `gcloud iam service-accounts add-iam-policy-binding ${API_SA} \\\n  --member=serviceAccount:${API_SA} --role=roles/iam.serviceAccountTokenCreator` },
        { d: 'Processor: read uploads, write thumbs, Firestore, BigQuery rows, Gemini', c: `gcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-uploads --member=serviceAccount:${PROC_SA} --role=roles/storage.objectViewer\ngcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-thumbs --member=serviceAccount:${PROC_SA} --role=roles/storage.objectUser\nfor role in roles/datastore.user roles/aiplatform.user; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${PROC_SA} --role=$role --condition=None\ndone\nbq add-iam-policy-binding --member=serviceAccount:${PROC_SA} --role=roles/bigquery.dataEditor $PROJECT_ID:imagestore.images` },
        { d: 'Gemini reads gs:// objects through the Agent Platform service agent', c: 'gcloud beta services identity create --service=aiplatform.googleapis.com\ngcloud storage buckets add-iam-policy-binding gs://$PROJECT_ID-uploads \\\n  --member=serviceAccount:service-$PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com --role=roles/storage.objectViewer' },
        { d: 'Eventarc: GCS publishes events via Pub/Sub; the trigger SA receives and invokes', c: `GCS_AGENT=$(gcloud storage service-agent --project=$PROJECT_ID)\ngcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$GCS_AGENT --role=roles/pubsub.publisher --condition=None\ngcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${TRIGGER_SA} --role=roles/eventarc.eventReceiver --condition=None` },
        { d: 'Test as a workload: list buckets impersonating the API SA', c: `gcloud storage ls --impersonate-service-account=${API_SA}` },
      ],
    },
    {
      title: '4. Deploy services & trigger',
      cmds: [
        { d: 'Processor (private, built from source by Cloud Build)', c: `gcloud run deploy imagestore-processor --source=processor --region=$REGION \\\n  --service-account=${PROC_SA} --no-allow-unauthenticated --memory=1Gi --timeout=300 --concurrency=4 \\\n  --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_ENTERPRISE=True,GOOGLE_GENAI_USE_VERTEXAI=True,\\\nTHUMBS_BUCKET=$PROJECT_ID-thumbs,CATALOG_TABLE=$PROJECT_ID.imagestore.images,VARIANT_STYLE="watercolour painting"` },
        { d: 'API (public; signed URLs carry the authorisation)', c: `gcloud run deploy imagestore-api --source=api --region=$REGION \\\n  --service-account=${API_SA} --allow-unauthenticated \\\n  --set-env-vars=UPLOADS_BUCKET=$PROJECT_ID-uploads,THUMBS_BUCKET=$PROJECT_ID-thumbs` },
        { d: 'Let the trigger SA invoke the processor, then create the trigger', c: `gcloud run services add-iam-policy-binding imagestore-processor --region=$REGION \\\n  --member=serviceAccount:${TRIGGER_SA} --role=roles/run.invoker\ngcloud eventarc triggers create imagestore-upload --location=$REGION \\\n  --destination-run-service=imagestore-processor --destination-run-region=$REGION \\\n  --event-filters="type=google.cloud.storage.object.v1.finalized" \\\n  --event-filters="bucket=$PROJECT_ID-uploads" \\\n  --service-account=${TRIGGER_SA}` },
      ],
    },
    {
      title: '5. Data exchange: share the catalog via Analytics Hub',
      note: 'Analytics Hub has no stable gcloud group, so these steps call its REST API with a gcloud token.',
      cmds: [
        { d: 'Create an exchange and a listing for the dataset', c: `TOKEN=$(gcloud auth print-access-token)\ncurl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges?dataExchangeId=media" -d '{"displayName":"Media data"}'\ncurl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges/media/listings?listingId=image_catalog" \\\n  -d "{\\"displayName\\":\\"Image catalog\\",\\"bigqueryDataset\\":{\\"dataset\\":\\"projects/$PROJECT_ID/datasets/imagestore\\"}}"` },
        { d: 'Allow the analytics team to subscribe', c: `curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges/media/listings/image_catalog:setIamPolicy" \\\n  -d '{"policy":{"bindings":[{"role":"roles/analyticshub.subscriber","members":["group:analytics@example.com"]}]}}'` },
        { d: 'Subscriber side (their project): get a linked, read-only dataset', c: `curl -s -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges/media/listings/image_catalog:subscribe" \\\n  -d '{"destinationDataset":{"datasetReference":{"projectId":"ANALYTICS_PROJECT","datasetId":"image_catalog"},"location":"eu"}}'` },
      ],
    },
    {
      title: '6. Test',
      cmds: [
        { d: 'Ask for an upload URL, then PUT the file', c: 'API=$(gcloud run services describe imagestore-api --region=$REGION --format="value(status.url)")\nRESP=$(curl -s -X POST "$API/uploads" -H "Content-Type: application/json" -d \'{"content_type":"image/jpeg","filename":"beach.jpg"}\')\ncurl -s -X PUT -H "Content-Type: image/jpeg" --upload-file beach.jpg "$(echo "$RESP" | jq -r .upload_url)"\nID=$(echo "$RESP" | jq -r .id)' },
        { d: 'A few seconds later: caption, tags and signed URLs', c: 'curl -s "$API/images/$ID" | jq \'{status, caption, tags, thumbnail_url, variant_url}\'' },
        { d: 'Search by tag', c: 'curl -s "$API/images?tag=beach" | jq .' },
        { d: 'Catalog in BigQuery', c: 'bq query --use_legacy_sql=false \'SELECT tag, COUNT(*) AS images FROM imagestore.images, UNNEST(tags) AS tag GROUP BY tag ORDER BY images DESC LIMIT 20\'' },
        { d: 'Processor logs and trigger status', c: 'gcloud beta run services logs read imagestore-processor --region=$REGION --limit=20\ngcloud eventarc triggers describe imagestore-upload --location=$REGION --format="value(transport.pubsub.subscription)"' },
      ],
    },
    {
      title: '7. Keyless CI/CD from GitHub (Workload Identity Federation)',
      cmds: [
        { d: 'Pool + OIDC provider restricted to your repository', c: 'gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"\ngcloud iam workload-identity-pools providers create-oidc github-oidc --location=global --workload-identity-pool=github \\\n  --issuer-uri="https://token.actions.githubusercontent.com" \\\n  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \\\n  --attribute-condition="assertion.repository==\'OWNER/imagestore\'"' },
        { d: 'The repo may impersonate the deployer SA', c: `gcloud iam service-accounts add-iam-policy-binding ${DEPLOY_SA} --role=roles/iam.workloadIdentityUser \\\n  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/imagestore"` },
        { d: 'Deployer rights: source deploys + act as the runtime SAs', c: `for role in roles/run.sourceDeveloper roles/serviceusage.serviceUsageConsumer; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${DEPLOY_SA} --role=$role --condition=None\ndone\nfor sa in ${API_SA} ${PROC_SA}; do\n  gcloud iam service-accounts add-iam-policy-binding $sa --member=serviceAccount:${DEPLOY_SA} --role=roles/iam.serviceAccountUser\ndone` },
      ],
    },
    {
      title: '8. Cleanup',
      cmds: [
        { d: 'Delete everything this example created', c: 'gcloud eventarc triggers delete imagestore-upload --location=$REGION --quiet\ngcloud run services delete imagestore-api --region=$REGION --quiet\ngcloud run services delete imagestore-processor --region=$REGION --quiet\ncurl -s -X DELETE -H "Authorization: Bearer $(gcloud auth print-access-token)" \\\n  "https://analyticshub.googleapis.com/v1/projects/$PROJECT_ID/locations/eu/dataExchanges/media"\nbq rm -r -f -d $PROJECT_ID:imagestore\ngcloud storage rm --recursive gs://$PROJECT_ID-uploads gs://$PROJECT_ID-thumbs\ngcloud iam workload-identity-pools delete github --location=global --quiet\nfor sa in imagestore-api imagestore-processor imagestore-trigger imagestore-deployer; do\n  gcloud iam service-accounts delete $sa@$PROJECT_ID.iam.gserviceaccount.com --quiet\ndone' },
      ],
    },
  ],
};
