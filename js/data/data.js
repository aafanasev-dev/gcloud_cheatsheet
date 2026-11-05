// Analytics Hub has no stable `gcloud` command group, so its examples call
// the REST API (analyticshub.googleapis.com/v1) with a gcloud access token.
const AH = 'https://analyticshub.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION';

export default {
  id: 'data',
  title: 'Data exchange',
  icon: 'exchange',
  color: 'data',
  description: 'Moving and sharing data: publishing datasets through Analytics Hub exchanges, messaging with Pub/Sub, bulk transfers, change-data-capture and processing pipelines.',
  useCases: [
    'Sharing BigQuery datasets with partners or other teams without copying data',
    'Event streaming between services',
    'Migrating files from S3 / on-prem into Cloud Storage',
    'Replicating operational databases into BigQuery',
  ],
  subtopics: [
    {
      id: 'analytics-hub',
      title: 'Analytics Hub (data exchanges)',
      icon: 'share',
      summary: 'Publish and subscribe to shared BigQuery datasets.',
      description: 'A publisher creates a data exchange and adds listings that point at a BigQuery dataset. A subscriber subscribes and gets a read-only linked dataset in their own project. No data is copied.',
      useCases: ['Sharing curated data with external partners', 'Internal data marketplace across business units', 'Consuming commercial / public datasets'],
      sections: [
        {
          title: 'Setup',
          note: 'Examples use the REST API through `curl` plus a gcloud token. `LOCATION` is the dataset location, e.g. `us` or `eu`.',
          cmds: [
            { d: 'Enable the API', c: 'gcloud services enable analyticshub.googleapis.com' },
            { d: 'Store a token for the calls below', c: 'TOKEN=$(gcloud auth print-access-token)' },
          ],
        },
        {
          title: 'Publisher: exchanges & listings',
          cmds: [
            { d: 'Create a data exchange', c: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges?dataExchangeId=EXCHANGE_ID" \\\n  -d '{"displayName": "Partner data", "description": "Curated sales data"}'` },
            { d: 'List data exchanges', c: `curl -H "Authorization: Bearer $TOKEN" "${AH}/dataExchanges"` },
            { d: 'Create a listing that shares a dataset', c: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges/EXCHANGE_ID/listings?listingId=LISTING_ID" \\\n  -d '{"displayName": "Daily sales", "bigqueryDataset": {"dataset": "projects/PROJECT_ID/datasets/DATASET"}}'` },
            { d: 'List listings in an exchange', c: `curl -H "Authorization: Bearer $TOKEN" "${AH}/dataExchanges/EXCHANGE_ID/listings"` },
            { d: 'Let a partner subscribe to a listing', c: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "${AH}/dataExchanges/EXCHANGE_ID/listings/LISTING_ID:setIamPolicy" \\\n  -d '{"policy": {"bindings": [{"role": "roles/analyticshub.subscriber", "members": ["group:partner@example.com"]}]}}'` },
            { d: 'List subscriptions to a listing', c: `curl -H "Authorization: Bearer $TOKEN" "${AH}/dataExchanges/EXCHANGE_ID/listings/LISTING_ID:listSubscriptions"` },
          ],
        },
        {
          title: 'Subscriber',
          cmds: [
            { d: 'Subscribe: creates a linked dataset in your project', c: `curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\\n  "https://analyticshub.googleapis.com/v1/projects/PUBLISHER_PROJECT/locations/LOCATION/dataExchanges/EXCHANGE_ID/listings/LISTING_ID:subscribe" \\\n  -d '{"destinationDataset": {"datasetReference": {"projectId": "PROJECT_ID", "datasetId": "partner_sales"}, "location": "LOCATION"}}'` },
            { d: 'Query the linked dataset like any other', c: 'bq query --use_legacy_sql=false \'SELECT * FROM `PROJECT_ID.partner_sales.daily` LIMIT 10\'' },
            { d: 'List your subscriptions', c: `curl -H "Authorization: Bearer $TOKEN" "https://analyticshub.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/subscriptions"` },
          ],
        },
      ],
    },
    {
      id: 'pubsub',
      title: 'Pub/Sub',
      icon: 'message',
      summary: 'Asynchronous messaging: topics and subscriptions.',
      description: 'Global publish/subscribe messaging. Publishers send to a topic; each subscription receives a copy by pull, push, or by writing directly to BigQuery or Cloud Storage.',
      useCases: ['Decoupling microservices', 'Ingesting event streams into BigQuery', 'Fan-out notifications'],
      sections: [
        {
          title: 'Topics',
          cmds: [
            { d: 'Create a topic', c: 'gcloud pubsub topics create TOPIC' },
            { d: 'Publish a message with attributes', c: 'gcloud pubsub topics publish TOPIC --message=\'{"order":42}\' --attribute=type=order.created' },
            { d: 'List topics / subscriptions of a topic', c: 'gcloud pubsub topics list\ngcloud pubsub topics list-subscriptions TOPIC' },
            { d: 'Attach a schema', c: 'gcloud pubsub schemas create order-schema --type=avro --definition-file=order.avsc\ngcloud pubsub topics create orders --schema=order-schema --message-encoding=json' },
          ],
        },
        {
          title: 'Subscriptions',
          cmds: [
            { d: 'Pull subscription', c: 'gcloud pubsub subscriptions create SUB_NAME --topic=TOPIC --ack-deadline=30' },
            { d: 'Pull and ack messages', c: 'gcloud pubsub subscriptions pull SUB_NAME --limit=10 --auto-ack' },
            { d: 'Push subscription to an HTTPS endpoint', c: 'gcloud pubsub subscriptions create SUB_NAME --topic=TOPIC --push-endpoint=https://SERVICE-xyz.a.run.app/events \\\n  --push-auth-service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'Write messages straight into BigQuery', c: 'gcloud pubsub subscriptions create SUB_NAME --topic=TOPIC --bigquery-table=PROJECT_ID:DATASET.TABLE --use-topic-schema' },
            { d: 'Dead-letter topic after 5 attempts', c: 'gcloud pubsub subscriptions update SUB_NAME --dead-letter-topic=TOPIC-dlq --max-delivery-attempts=5' },
            { d: 'Replay: seek to a point in time', c: 'gcloud pubsub subscriptions seek SUB_NAME --time=2026-01-01T00:00:00Z' },
          ],
        },
      ],
    },
    {
      id: 'transfer',
      title: 'Storage Transfer Service',
      icon: 'truck',
      summary: 'Bulk copy from S3, Azure, HTTP or on-prem to GCS.',
      description: 'Managed, scheduled bulk transfers into or between Cloud Storage buckets, with checksums and retries.',
      useCases: ['Migrating an S3 bucket to Cloud Storage', 'Nightly sync between buckets', 'Moving on-prem file shares with transfer agents'],
      sections: [
        {
          title: 'Jobs',
          cmds: [
            { d: 'One-off copy between buckets', c: 'gcloud transfer jobs create gs://SOURCE_BUCKET gs://BUCKET_NAME' },
            { d: 'Copy from S3 using a credentials file', c: 'gcloud transfer jobs create s3://SOURCE_BUCKET gs://BUCKET_NAME --source-creds-file=aws-creds.json' },
            { d: 'Scheduled daily sync that deletes extras at the destination', c: 'gcloud transfer jobs create gs://SOURCE_BUCKET gs://BUCKET_NAME \\\n  --schedule-repeats-every=1d --delete-from=destination-if-unique' },
            { d: 'List jobs / monitor an operation', c: 'gcloud transfer jobs list\ngcloud transfer operations list --job-names=JOB_NAME' },
            { d: 'Run a job now', c: 'gcloud transfer jobs run JOB_NAME' },
          ],
        },
      ],
    },
    {
      id: 'datastream',
      title: 'Datastream (CDC)',
      icon: 'stream',
      summary: 'Change data capture from MySQL/Postgres/Oracle to BigQuery.',
      description: 'Serverless change-data-capture: replicates inserts, updates and deletes from operational databases into BigQuery or Cloud Storage in near real time.',
      useCases: ['Live analytics on a production database', 'Database migration with minimal downtime', 'Feeding a data lake with change events'],
      sections: [
        {
          title: 'Connection profiles & streams',
          cmds: [
            { d: 'Source profile: PostgreSQL', c: 'gcloud datastream connection-profiles create pg-src --location=REGION --type=postgresql --display-name="Prod PG" \\\n  --postgresql-hostname=10.0.0.5 --postgresql-port=5432 --postgresql-username=datastream \\\n  --postgresql-password=CHANGE_ME --postgresql-database=appdb --static-ip-connectivity' },
            { d: 'Destination profile: BigQuery', c: 'gcloud datastream connection-profiles create bq-dst --location=REGION --type=bigquery --display-name="BQ"' },
            { d: 'Create a stream', c: 'gcloud datastream streams create pg-to-bq --location=REGION --display-name="PG to BQ" \\\n  --source=pg-src --postgresql-source-config=source.json \\\n  --destination=bq-dst --bigquery-destination-config=dest.json --backfill-all' },
            { d: 'Start / pause a stream', c: 'gcloud datastream streams update pg-to-bq --location=REGION --state=RUNNING --update-mask=state\ngcloud datastream streams update pg-to-bq --location=REGION --state=PAUSED --update-mask=state' },
            { d: 'List streams', c: 'gcloud datastream streams list --location=REGION' },
          ],
        },
      ],
    },
    {
      id: 'dataflow',
      title: 'Dataflow',
      icon: 'flow',
      summary: 'Apache Beam pipelines, batch and streaming.',
      description: 'Managed Apache Beam runner. Start from a Google-provided template or deploy your own Flex Template.',
      useCases: ['Streaming Pub/Sub → BigQuery ETL', 'Large batch transforms over GCS files', 'Exactly-once stream processing'],
      sections: [
        {
          title: 'Jobs',
          cmds: [
            { d: 'Run a classic Google template (GCS text → BigQuery)', c: 'gcloud dataflow jobs run gcs-to-bq --region=REGION \\\n  --gcs-location=gs://dataflow-templates-REGION/latest/GCS_Text_to_BigQuery \\\n  --parameters=inputFilePattern=gs://BUCKET_NAME/in/*.json,JSONPath=gs://BUCKET_NAME/schema.json,outputTable=PROJECT_ID:DATASET.TABLE,javascriptTextTransformGcsPath=gs://BUCKET_NAME/udf.js,javascriptTextTransformFunctionName=transform,bigQueryLoadingTemporaryDirectory=gs://BUCKET_NAME/tmp' },
            { d: 'Run a Flex Template (Pub/Sub → BigQuery)', c: 'gcloud dataflow flex-template run ps-to-bq --region=REGION \\\n  --template-file-gcs-location=gs://dataflow-templates-REGION/latest/flex/PubSub_to_BigQuery_Flex \\\n  --parameters=inputSubscription=projects/PROJECT_ID/subscriptions/SUB_NAME,outputTableSpec=PROJECT_ID:DATASET.TABLE' },
            { d: 'List / describe jobs', c: 'gcloud dataflow jobs list --region=REGION --status=active\ngcloud dataflow jobs describe JOB_ID --region=REGION' },
            { d: 'Drain (finish in-flight) or cancel', c: 'gcloud dataflow jobs drain JOB_ID --region=REGION\ngcloud dataflow jobs cancel JOB_ID --region=REGION' },
          ],
        },
      ],
    },
    {
      id: 'dataproc',
      title: 'Dataproc (Spark)',
      icon: 'gears',
      summary: 'Managed Spark/Hadoop clusters and serverless batches.',
      description: 'Run Apache Spark, Hadoop and Hive either on short-lived clusters or as serverless batches with no cluster to manage.',
      useCases: ['Migrating existing Spark jobs', 'PySpark ETL over GCS / BigQuery', 'Ephemeral clusters per job'],
      sections: [
        {
          title: 'Serverless batches',
          cmds: [
            { d: 'Submit a PySpark batch', c: 'gcloud dataproc batches submit pyspark gs://BUCKET_NAME/jobs/etl.py --region=REGION -- --date=2026-01-01' },
            { d: 'List / inspect batches', c: 'gcloud dataproc batches list --region=REGION\ngcloud dataproc batches describe BATCH_ID --region=REGION' },
          ],
        },
        {
          title: 'Clusters & jobs',
          cmds: [
            { d: 'Create a cluster that deletes itself after 30 min idle', c: 'gcloud dataproc clusters create CLUSTER_NAME --region=REGION --num-workers=2 --worker-machine-type=n2-standard-4 --max-idle=30m' },
            { d: 'Submit a PySpark job', c: 'gcloud dataproc jobs submit pyspark gs://BUCKET_NAME/jobs/etl.py --cluster=CLUSTER_NAME --region=REGION' },
            { d: 'Submit a Spark SQL query', c: 'gcloud dataproc jobs submit spark-sql --cluster=CLUSTER_NAME --region=REGION -e="SHOW DATABASES"' },
            { d: 'Delete the cluster', c: 'gcloud dataproc clusters delete CLUSTER_NAME --region=REGION' },
          ],
        },
      ],
    },
    {
      id: 'bq-transfer',
      title: 'BigQuery Data Transfer',
      icon: 'calendar',
      summary: 'Scheduled loads from SaaS, S3 and scheduled queries.',
      description: 'Managed, scheduled ingestion into BigQuery from Google Ads, YouTube, S3, other warehouses, and scheduled SQL queries.',
      useCases: ['Nightly import of marketing data', 'Scheduled queries that build summary tables', 'Copying datasets across regions'],
      sections: [
        {
          title: 'Transfer configs',
          cmds: [
            { d: 'Create a scheduled query', c: 'bq mk --transfer_config --data_source=scheduled_query --target_dataset=DATASET \\\n  --display_name="Daily summary" --schedule="every 24 hours" \\\n  --params=\'{"query":"SELECT CURRENT_DATE() AS d, COUNT(*) AS n FROM `DATASET.events`","destination_table_name_template":"summary_{run_date}","write_disposition":"WRITE_TRUNCATE"}\'' },
            { d: 'Copy a dataset (e.g. to another region)', c: 'bq mk --transfer_config --data_source=cross_region_copy --project_id=PROJECT_ID --target_dataset=DATASET_copy \\\n  --display_name="Copy" --params=\'{"source_dataset_id":"DATASET","source_project_id":"PROJECT_ID"}\'' },
            { d: 'List transfer configs', c: 'bq ls --transfer_config --transfer_location=EU' },
            { d: 'List runs of a config', c: 'bq ls --transfer_run projects/PROJECT_NUMBER/locations/eu/transferConfigs/CONFIG_ID' },
          ],
        },
      ],
    },
  ],
};
