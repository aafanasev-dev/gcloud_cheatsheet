// Page metadata for the Bookstore example; tools/gen-examples.mjs merges it
// with the source files listed in `files`.
const RUN_SA = 'bookstore-run@$PROJECT_ID.iam.gserviceaccount.com';
const BUILD_SA = 'bookstore-build@$PROJECT_ID.iam.gserviceaccount.com';

export default {
  id: 'bookstore',
  title: 'Bookstore (Cloud Run + Cloud SQL)',
  icon: 'book',
  summary: 'FastAPI shop on Cloud Run, Cloud SQL, Pub/Sub → BigQuery, Gemini blurbs.',
  description: 'A REST API for a small bookstore. Books and orders live in Cloud SQL for PostgreSQL. Every order is published to Pub/Sub, and a BigQuery subscription streams it into a sales table for reporting. When a book is added without a description, Gemini writes a blurb and picks genres, and it recommends similar titles on request. The image is built by Cloud Build into Artifact Registry and runs on Cloud Run as a least-privilege service account.',
  useCases: [
    'A template for any CRUD API on Cloud Run backed by Postgres',
    'Real-time sales analytics without an ETL job (Pub/Sub → BigQuery subscription)',
    'Adding structured Gemini output (JSON schema) to an existing app',
  ],
  covers: [
    ['start', 'config'], ['start', 'projects'],
    ['storage', 'cloudsql'], ['storage', 'bigquery'],
    ['compute', 'cloudrun'], ['compute', 'artifacts'], ['compute', 'cloudbuild'],
    ['iam', 'service-accounts'], ['iam', 'policies'],
    ['data', 'pubsub'],
    ['apis', 'services'], ['apis', 'rest'],
    ['gemini', 'text'], ['gemini', 'python-sdk'],
  ],
  flow: [
    ['curl / client', 'Cloud Run: bookstore', 'Cloud SQL (Postgres)'],
    ['Cloud Run: bookstore', 'Gemini (blurbs, recommendations)'],
    ['Cloud Run: bookstore', 'Pub/Sub: orders', 'BigQuery: bookstore.orders'],
  ],
  files: [
    { path: 'main.py', lang: 'python', open: true },
    { path: 'schema.sql', lang: 'sql' },
    { path: 'requirements.txt', lang: 'text' },
    { path: 'Dockerfile', lang: 'dockerfile' },
    { path: 'cloudbuild.yaml', lang: 'yaml' },
  ],
  sections: [
    {
      title: '1. Project & APIs',
      note: 'Run everything from the folder that contains the source files. The variables set here are used in every later step.',
      cmds: [
        { d: 'Variables', c: 'export PROJECT_ID=my-bookstore REGION=europe-west1' },
        { d: 'A dedicated gcloud configuration for this app', c: 'gcloud config configurations create bookstore\ngcloud config set project $PROJECT_ID\ngcloud config set run/region $REGION' },
        { d: 'Create the project and link billing (skip if it exists)', c: 'gcloud projects create $PROJECT_ID --name="Bookstore"\ngcloud billing projects link $PROJECT_ID --billing-account=XXXXXX-XXXXXX-XXXXXX' },
        { d: 'Enable every API the app uses', c: 'gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com \\\n  artifactregistry.googleapis.com cloudbuild.googleapis.com pubsub.googleapis.com \\\n  bigquery.googleapis.com aiplatform.googleapis.com' },
      ],
    },
    {
      title: '2. IAM: service accounts',
      cmds: [
        { d: 'Runtime identity for the Cloud Run service', c: 'gcloud iam service-accounts create bookstore-run --display-name="Bookstore runtime"' },
        { d: 'Grant only what the app needs: DB connections, publishing orders, calling Gemini', c: `for role in roles/cloudsql.client roles/pubsub.publisher roles/aiplatform.user; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${RUN_SA} --role=$role --condition=None\ndone` },
        { d: 'Build identity for Cloud Build', c: 'gcloud iam service-accounts create bookstore-build --display-name="Bookstore CI"' },
        { d: 'Let it push images, deploy revisions, write logs and read uploaded sources', c: `for role in roles/artifactregistry.writer roles/run.developer roles/logging.logWriter roles/storage.objectViewer; do\n  gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:${BUILD_SA} --role=$role --condition=None\ndone` },
        { d: 'Allow the builder to deploy revisions that run as the runtime SA', c: `gcloud iam service-accounts add-iam-policy-binding ${RUN_SA} \\\n  --member=serviceAccount:${BUILD_SA} --role=roles/iam.serviceAccountUser` },
      ],
    },
    {
      title: '3. Storage: Cloud SQL + secret',
      cmds: [
        { d: 'Create a small PostgreSQL instance (takes a few minutes)', c: 'gcloud sql instances create bookstore-db --database-version=POSTGRES_16 --edition=ENTERPRISE \\\n  --tier=db-f1-micro --region=$REGION' },
        { d: 'Database and application user with a random password', c: 'gcloud sql databases create bookstore --instance=bookstore-db\nDB_PASS=$(openssl rand -base64 24)\ngcloud sql users create bookstore --instance=bookstore-db --password="$DB_PASS"' },
        { d: 'Keep the password in Secret Manager, readable only by the runtime SA', c: `printf %s "$DB_PASS" | gcloud secrets create bookstore-db-pass --data-file=-\ngcloud secrets add-iam-policy-binding bookstore-db-pass \\\n  --member=serviceAccount:${RUN_SA} --role=roles/secretmanager.secretAccessor` },
      ],
    },
    {
      title: '4. Data exchange: orders → Pub/Sub → BigQuery',
      cmds: [
        { d: 'Dataset and an orders table whose columns match the JSON event', c: 'bq --location=EU mk --dataset $PROJECT_ID:bookstore\nbq mk --table --time_partitioning_field=created_at bookstore.orders \\\n  order_id:STRING,book_id:INTEGER,title:STRING,quantity:INTEGER,amount:NUMERIC,customer:STRING,created_at:TIMESTAMP' },
        { d: 'Topic + dead-letter topic', c: 'gcloud pubsub topics create orders\ngcloud pubsub topics create orders-dlq' },
        { d: 'Allow the Pub/Sub service agent to write to BigQuery', c: 'PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")\ngcloud projects add-iam-policy-binding $PROJECT_ID --condition=None \\\n  --member=serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com --role=roles/bigquery.dataEditor' },
        { d: 'BigQuery subscription: each message becomes a row (JSON fields → columns)', c: 'gcloud pubsub subscriptions create orders-to-bq --topic=orders \\\n  --bigquery-table=$PROJECT_ID:bookstore.orders --use-table-schema \\\n  --dead-letter-topic=orders-dlq --max-delivery-attempts=5' },
      ],
    },
    {
      title: '5. Build & deploy',
      cmds: [
        { d: 'Docker repository in Artifact Registry', c: 'gcloud artifacts repositories create apps --repository-format=docker --location=$REGION --description="App images"' },
        { d: 'Create the service with its full config (placeholder image first; Cloud Build swaps it in the next step)', c: `gcloud run deploy bookstore --image=us-docker.pkg.dev/cloudrun/container/hello --region=$REGION \\\n  --service-account=${RUN_SA} --no-allow-unauthenticated \\\n  --set-env-vars=GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_ENTERPRISE=True,GOOGLE_GENAI_USE_VERTEXAI=True,\\\nINSTANCE_CONNECTION_NAME=$PROJECT_ID:$REGION:bookstore-db,DB_USER=bookstore,DB_NAME=bookstore,ORDERS_TOPIC=orders \\\n  --set-secrets=DB_PASS=bookstore-db-pass:latest --memory=512Mi --max-instances=5` },
        { d: 'Build, push and roll out with cloudbuild.yaml, running as the build SA', c: `gcloud builds submit --config=cloudbuild.yaml --region=$REGION --substitutions=_REGION=$REGION \\\n  --service-account=projects/$PROJECT_ID/serviceAccounts/${BUILD_SA}` },
        { d: 'Optional: redeploy on every push to main of a connected GitHub repo', c: `gcloud builds triggers create github --name=bookstore-main --region=$REGION \\\n  --repo-owner=OWNER --repo-name=bookstore --branch-pattern="^main$" --build-config=cloudbuild.yaml \\\n  --service-account=projects/$PROJECT_ID/serviceAccounts/${BUILD_SA}` },
      ],
    },
    {
      title: '6. Test',
      cmds: [
        { d: 'URL and an identity token (the service is private)', c: 'URL=$(gcloud run services describe bookstore --region=$REGION --format="value(status.url)")\nTOKEN=$(gcloud auth print-identity-token)' },
        { d: 'Let a teammate call it too', c: 'gcloud run services add-iam-policy-binding bookstore --region=$REGION --member=user:teammate@example.com --role=roles/run.invoker' },
        { d: 'Add a book; Gemini fills in description and genres', c: 'curl -s -X POST "$URL/books" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  -d \'{"title":"Dune","author":"Frank Herbert","price":12.50}\' | jq .' },
        { d: 'Recommendations from Gemini', c: 'curl -s "$URL/books/1/similar" -H "Authorization: Bearer $TOKEN" | jq .' },
        { d: 'Place an order (published to Pub/Sub)', c: 'curl -s -X POST "$URL/orders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  -d \'{"book_id":1,"quantity":2,"customer":"ada@example.com"}\' | jq .' },
        { d: 'The order is already queryable in BigQuery', c: 'bq query --use_legacy_sql=false \'SELECT title, SUM(quantity) AS copies, SUM(amount) AS revenue FROM bookstore.orders GROUP BY title ORDER BY revenue DESC\'' },
        { d: 'Logs', c: 'gcloud beta run services logs read bookstore --region=$REGION --limit=50' },
      ],
    },
    {
      title: '7. Cleanup',
      cmds: [
        { d: 'Delete everything this example created', c: 'gcloud run services delete bookstore --region=$REGION --quiet\ngcloud sql instances delete bookstore-db --quiet\ngcloud pubsub subscriptions delete orders-to-bq --quiet\ngcloud pubsub topics delete orders orders-dlq --quiet\nbq rm -r -f -d $PROJECT_ID:bookstore\ngcloud secrets delete bookstore-db-pass --quiet\ngcloud artifacts repositories delete apps --location=$REGION --quiet\ngcloud iam service-accounts delete bookstore-run@$PROJECT_ID.iam.gserviceaccount.com --quiet\ngcloud iam service-accounts delete bookstore-build@$PROJECT_ID.iam.gserviceaccount.com --quiet' },
      ],
    },
  ],
};
