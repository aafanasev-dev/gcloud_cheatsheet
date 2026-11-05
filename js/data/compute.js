export default {
  id: 'compute',
  title: 'Compute',
  icon: 'cpu',
  color: 'compute',
  description: 'Where code runs: virtual machines, serverless containers and functions, Kubernetes, plus the registry and build service that feed them.',
  useCases: [
    'Long-running servers and custom OS images on VMs',
    'Stateless HTTP services and jobs on Cloud Run',
    'Event-driven functions (the GCP counterpart of AWS Lambda)',
    'Building, storing and deploying container images',
  ],
  subtopics: [
    {
      id: 'vms',
      title: 'Compute Engine VMs',
      icon: 'server',
      summary: 'Virtual machines, disks, snapshots, images, SSH, MIGs.',
      description: 'IaaS virtual machines with full OS control. Machine types range from shared-core `e2-micro` to GPU and memory-optimised shapes.',
      useCases: ['Self-managed databases or legacy apps', 'GPU training / rendering boxes', 'Autoscaled fleets with managed instance groups'],
      sections: [
        {
          title: 'Instances',
          cmds: [
            { d: 'Create a Debian VM', c: 'gcloud compute instances create VM_NAME --zone=europe-west1-b --machine-type=e2-medium \\\n  --image-family=debian-12 --image-project=debian-cloud --boot-disk-size=20GB --tags=http-server' },
            { d: 'Create a Spot VM (cheap, preemptible)', c: 'gcloud compute instances create VM_NAME --zone=ZONE --provisioning-model=SPOT --instance-termination-action=STOP' },
            { d: 'Create with a startup script', c: 'gcloud compute instances create VM_NAME --zone=ZONE --metadata-from-file=startup-script=startup.sh' },
            { d: 'List / describe', c: 'gcloud compute instances list\ngcloud compute instances describe VM_NAME --zone=ZONE' },
            { d: 'Stop / start / reset', c: 'gcloud compute instances stop VM_NAME --zone=ZONE\ngcloud compute instances start VM_NAME --zone=ZONE\ngcloud compute instances reset VM_NAME --zone=ZONE' },
            { d: 'Change machine type (VM must be stopped)', c: 'gcloud compute instances set-machine-type VM_NAME --zone=ZONE --machine-type=e2-standard-4' },
            { d: 'Delete', c: 'gcloud compute instances delete VM_NAME --zone=ZONE' },
            { d: 'Browse machine types and images', c: 'gcloud compute machine-types list --zones=europe-west1-b --filter="name~^e2"\ngcloud compute images list --filter="family~debian"' },
          ],
        },
        {
          title: 'SSH & files',
          cmds: [
            { d: 'SSH into a VM (sets up keys automatically)', c: 'gcloud compute ssh VM_NAME --zone=ZONE' },
            { d: 'SSH through IAP, no external IP needed', c: 'gcloud compute ssh VM_NAME --zone=ZONE --tunnel-through-iap' },
            { d: 'Run a remote command', c: 'gcloud compute ssh VM_NAME --zone=ZONE --command="sudo systemctl status nginx"' },
            { d: 'Copy files to / from a VM', c: 'gcloud compute scp ./app.tar.gz VM_NAME:~/ --zone=ZONE\ngcloud compute scp VM_NAME:~/logs.txt . --zone=ZONE' },
            { d: 'Read the serial console output (boot problems)', c: 'gcloud compute instances get-serial-port-output VM_NAME --zone=ZONE' },
          ],
        },
        {
          title: 'Disks, snapshots, images',
          cmds: [
            { d: 'Create and attach a data disk', c: 'gcloud compute disks create data-disk --size=100GB --type=pd-balanced --zone=ZONE\ngcloud compute instances attach-disk VM_NAME --disk=data-disk --zone=ZONE' },
            { d: 'Resize a disk', c: 'gcloud compute disks resize data-disk --size=200GB --zone=ZONE' },
            { d: 'Snapshot a disk', c: 'gcloud compute snapshots create data-snap --source-disk=data-disk --source-disk-zone=ZONE' },
            { d: 'Create a custom image from a disk', c: 'gcloud compute images create my-image --source-disk=VM_NAME --source-disk-zone=ZONE --family=my-family' },
          ],
        },
        {
          title: 'Networking & firewall',
          cmds: [
            { d: 'Allow HTTP/HTTPS to tagged VMs', c: 'gcloud compute firewall-rules create allow-web --network=default --allow=tcp:80,tcp:443 --target-tags=http-server --source-ranges=0.0.0.0/0' },
            { d: 'Reserve a static external IP', c: 'gcloud compute addresses create web-ip --region=europe-west1' },
            { d: 'Create a custom VPC and subnet', c: 'gcloud compute networks create my-vpc --subnet-mode=custom\ngcloud compute networks subnets create my-subnet --network=my-vpc --region=europe-west1 --range=10.10.0.0/24' },
          ],
        },
        {
          title: 'Templates & managed instance groups',
          cmds: [
            { d: 'Create an instance template', c: 'gcloud compute instance-templates create web-tpl --machine-type=e2-small --image-family=debian-12 --image-project=debian-cloud --metadata-from-file=startup-script=startup.sh' },
            { d: 'Create a regional MIG', c: 'gcloud compute instance-groups managed create web-mig --template=web-tpl --size=2 --region=europe-west1' },
            { d: 'Enable autoscaling', c: 'gcloud compute instance-groups managed set-autoscaling web-mig --region=europe-west1 --min-num-replicas=2 --max-num-replicas=10 --target-cpu-utilization=0.6' },
            { d: 'Rolling update to a new template', c: 'gcloud compute instance-groups managed rolling-action start-update web-mig --version=template=web-tpl-v2 --region=europe-west1' },
          ],
        },
      ],
    },
    {
      id: 'cloudrun',
      title: 'Cloud Run (containers)',
      icon: 'container',
      summary: 'Serverless containers: services, jobs, revisions, traffic.',
      description: 'Runs any container that listens on `$PORT` and scales to zero. Services serve HTTP; jobs run to completion.',
      useCases: ['Web apps and APIs without managing servers', 'Batch tasks and cron jobs (Cloud Run jobs)', 'Canary releases with traffic splitting'],
      sections: [
        {
          title: 'Services',
          cmds: [
            { d: 'Deploy an image', c: 'gcloud run deploy SERVICE --image=REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG --region=REGION --allow-unauthenticated' },
            { d: 'Build from source and deploy in one step', c: 'gcloud run deploy SERVICE --source=. --region=REGION' },
            { d: 'Set env vars, memory, concurrency and scaling', c: 'gcloud run deploy SERVICE --image=IMAGE --region=REGION \\\n  --set-env-vars=ENV=prod,LOG_LEVEL=info --memory=1Gi --cpu=1 \\\n  --concurrency=80 --min-instances=0 --max-instances=10' },
            { d: 'Mount a Secret Manager secret as an env var', c: 'gcloud run services update SERVICE --region=REGION --set-secrets=DB_PASSWORD=db-password:latest' },
            { d: 'Run as a specific service account', c: 'gcloud run services update SERVICE --region=REGION --service-account=SA_NAME@PROJECT_ID.iam.gserviceaccount.com' },
            { d: 'List / describe / get URL', c: 'gcloud run services list\ngcloud run services describe SERVICE --region=REGION --format="value(status.url)"' },
            { d: 'Read logs', c: 'gcloud beta run services logs read SERVICE --region=REGION --limit=50' },
            { d: 'Delete', c: 'gcloud run services delete SERVICE --region=REGION' },
          ],
        },
        {
          title: 'Revisions & traffic',
          cmds: [
            { d: 'Deploy a new revision with no traffic, tagged for testing', c: 'gcloud run deploy SERVICE --image=IMAGE:v2 --region=REGION --no-traffic --tag=canary' },
            { d: 'Send 10% of traffic to a revision', c: 'gcloud run services update-traffic SERVICE --region=REGION --to-revisions=SERVICE-00002-abc=10' },
            { d: 'Route all traffic to the latest revision', c: 'gcloud run services update-traffic SERVICE --region=REGION --to-latest' },
            { d: 'List revisions', c: 'gcloud run revisions list --service=SERVICE --region=REGION' },
          ],
        },
        {
          title: 'Jobs',
          cmds: [
            { d: 'Create a job', c: 'gcloud run jobs create JOB_NAME --image=IMAGE --region=REGION --tasks=10 --max-retries=3 --task-timeout=10m' },
            { d: 'Execute a job and wait', c: 'gcloud run jobs execute JOB_NAME --region=REGION --wait' },
            { d: 'List executions', c: 'gcloud run jobs executions list --job=JOB_NAME --region=REGION' },
          ],
        },
        {
          title: 'Access',
          cmds: [
            { d: 'Allow public access', c: 'gcloud run services add-iam-policy-binding SERVICE --region=REGION --member=allUsers --role=roles/run.invoker' },
            { d: 'Call a private service', c: 'curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://SERVICE-xyz.a.run.app' },
            { d: 'Proxy a private service to localhost', c: 'gcloud run services proxy SERVICE --region=REGION --port=8080' },
          ],
        },
      ],
    },
    {
      id: 'functions',
      title: 'Cloud Functions (lambdas)',
      icon: 'lambda',
      summary: 'Event-driven functions: HTTP, Pub/Sub, Storage triggers.',
      description: 'Single-purpose functions triggered by HTTP or events, the GCP counterpart of AWS Lambda. 2nd-gen functions run on Cloud Run under the hood (`--gen2`).',
      useCases: ['Webhooks and lightweight APIs', 'Reacting to file uploads or Pub/Sub messages', 'Glue code between services'],
      sections: [
        {
          title: 'Deploy',
          cmds: [
            { d: 'Deploy an HTTP function (Python)', c: 'gcloud functions deploy hello --gen2 --runtime=python312 --region=REGION \\\n  --source=. --entry-point=hello --trigger-http --allow-unauthenticated' },
            { d: 'Trigger on Pub/Sub messages', c: 'gcloud functions deploy on-message --gen2 --runtime=nodejs22 --region=REGION \\\n  --source=. --entry-point=handler --trigger-topic=TOPIC' },
            { d: 'Trigger when an object lands in a bucket', c: 'gcloud functions deploy on-upload --gen2 --runtime=go123 --region=REGION --source=. --entry-point=OnUpload \\\n  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \\\n  --trigger-event-filters="bucket=BUCKET_NAME"' },
            { d: 'Set memory, timeout, env vars and secrets', c: 'gcloud functions deploy hello --gen2 --region=REGION --memory=512Mi --timeout=120s \\\n  --set-env-vars=MODE=prod --set-secrets=API_KEY=api-key:latest' },
          ],
        },
        {
          title: 'Operate',
          cmds: [
            { d: 'List / describe', c: 'gcloud functions list\ngcloud functions describe hello --region=REGION --gen2' },
            { d: 'Invoke directly', c: 'gcloud functions call hello --region=REGION --gen2 --data=\'{"name":"Ada"}\'' },
            { d: 'Read logs', c: 'gcloud functions logs read hello --region=REGION --gen2 --limit=50' },
            { d: 'List available runtimes', c: 'gcloud functions runtimes list --region=REGION' },
            { d: 'Delete', c: 'gcloud functions delete hello --region=REGION --gen2' },
          ],
        },
      ],
    },
    {
      id: 'gke',
      title: 'Kubernetes Engine (GKE)',
      icon: 'kube',
      summary: 'Managed Kubernetes clusters (Autopilot / Standard).',
      description: 'Managed Kubernetes. Autopilot manages nodes for you; Standard gives you control of node pools. Day-to-day work then uses `kubectl`.',
      useCases: ['Running microservices that need Kubernetes features', 'Portable workloads across clouds', 'GPU / batch scheduling with node pools'],
      sections: [
        {
          title: 'Clusters',
          cmds: [
            { d: 'Create an Autopilot cluster', c: 'gcloud container clusters create-auto CLUSTER_NAME --region=europe-west1' },
            { d: 'Create a Standard cluster', c: 'gcloud container clusters create CLUSTER_NAME --zone=europe-west1-b --num-nodes=3 --machine-type=e2-standard-4 --enable-autoscaling --min-nodes=1 --max-nodes=5' },
            { d: 'Get kubectl credentials', c: 'gcloud container clusters get-credentials CLUSTER_NAME --region=europe-west1' },
            { d: 'List clusters', c: 'gcloud container clusters list' },
            { d: 'Upgrade the control plane', c: 'gcloud container clusters upgrade CLUSTER_NAME --region=europe-west1 --master --cluster-version=latest' },
            { d: 'Delete', c: 'gcloud container clusters delete CLUSTER_NAME --region=europe-west1' },
          ],
        },
        {
          title: 'Node pools',
          cmds: [
            { d: 'Add a Spot node pool', c: 'gcloud container node-pools create spot-pool --cluster=CLUSTER_NAME --zone=ZONE --spot --machine-type=e2-standard-4 --num-nodes=2' },
            { d: 'Resize a node pool', c: 'gcloud container clusters resize CLUSTER_NAME --node-pool=default-pool --num-nodes=5 --zone=ZONE' },
            { d: 'List node pools', c: 'gcloud container node-pools list --cluster=CLUSTER_NAME --zone=ZONE' },
          ],
        },
      ],
    },
    {
      id: 'appengine',
      title: 'App Engine',
      icon: 'app',
      summary: 'PaaS for web apps from app.yaml.',
      description: 'The original GCP PaaS: deploy source with an `app.yaml`, and versions and traffic splitting are built in. For new apps, Cloud Run is usually the better fit.',
      useCases: ['Maintaining existing App Engine apps', 'Simple web apps with built-in versioning'],
      sections: [
        {
          title: 'Deploy & manage',
          cmds: [
            { d: 'Create the App Engine app (once per project)', c: 'gcloud app create --region=europe-west' },
            { d: 'Deploy using app.yaml in the current dir', c: 'gcloud app deploy app.yaml --version=v2 --no-promote' },
            { d: 'Split traffic between versions', c: 'gcloud app services set-traffic default --splits=v1=0.9,v2=0.1' },
            { d: 'Open in browser / stream logs', c: 'gcloud app browse\ngcloud app logs tail -s default' },
            { d: 'List / delete versions', c: 'gcloud app versions list\ngcloud app versions delete v1' },
          ],
        },
      ],
    },
    {
      id: 'artifacts',
      title: 'Artifact Registry',
      icon: 'package',
      summary: 'Docker, npm, Maven, Python package repositories.',
      description: 'Private registries for container images and language packages. It replaces Container Registry (gcr.io). Image path: `REGION-docker.pkg.dev/PROJECT/REPO/IMAGE`.',
      useCases: ['Storing images for Cloud Run / GKE', 'Private npm / PyPI / Maven packages', 'Vulnerability scanning and cleanup policies'],
      sections: [
        {
          title: 'Repositories',
          cmds: [
            { d: 'Create a Docker repository', c: 'gcloud artifacts repositories create REPO --repository-format=docker --location=REGION --description="App images"' },
            { d: 'Create a Python / npm repository', c: 'gcloud artifacts repositories create py-repo --repository-format=python --location=REGION\ngcloud artifacts repositories create npm-repo --repository-format=npm --location=REGION' },
            { d: 'List repositories', c: 'gcloud artifacts repositories list --location=REGION' },
            { d: 'Apply a cleanup policy (e.g. keep the last 10 versions)', c: 'gcloud artifacts repositories set-cleanup-policies REPO --location=REGION --policy=cleanup.json --no-dry-run' },
          ],
        },
        {
          title: 'Docker images',
          cmds: [
            { d: 'Authenticate Docker', c: 'gcloud auth configure-docker REGION-docker.pkg.dev' },
            { d: 'Tag and push', c: 'docker tag IMAGE:TAG REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG\ndocker push REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG' },
            { d: 'List images and tags', c: 'gcloud artifacts docker images list REGION-docker.pkg.dev/PROJECT_ID/REPO --include-tags' },
            { d: 'Delete an image', c: 'gcloud artifacts docker images delete REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG --delete-tags' },
            { d: 'Show vulnerability scan results', c: 'gcloud artifacts docker images describe REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG --show-package-vulnerability' },
          ],
        },
        {
          title: 'Access',
          cmds: [
            { d: 'Grant pull access to a service account', c: 'gcloud artifacts repositories add-iam-policy-binding REPO --location=REGION \\\n  --member=serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com --role=roles/artifactregistry.reader' },
            { d: 'Print pip / npm settings for a repo', c: 'gcloud artifacts print-settings python --repository=py-repo --location=REGION\ngcloud artifacts print-settings npm --repository=npm-repo --location=REGION' },
          ],
        },
      ],
    },
    {
      id: 'cloudbuild',
      title: 'Cloud Build',
      icon: 'hammer',
      summary: 'Serverless CI: build images, run steps, triggers.',
      description: 'Runs build steps in containers. Use it to build and push images or to run a `cloudbuild.yaml` pipeline on every push.',
      useCases: ['Building Docker images without local Docker', 'CI/CD from GitHub on push', 'Running migrations or tests in a pipeline'],
      sections: [
        {
          title: 'Builds',
          cmds: [
            { d: 'Build the Dockerfile in the current dir and push', c: 'gcloud builds submit --tag=REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG' },
            { d: 'Run a cloudbuild.yaml with substitutions', c: 'gcloud builds submit --config=cloudbuild.yaml --substitutions=_ENV=prod,_REGION=europe-west1' },
            { d: 'List / stream logs of builds', c: 'gcloud builds list --limit=5\ngcloud builds log BUILD_ID --stream' },
          ],
        },
        {
          title: 'Triggers',
          cmds: [
            { d: 'Trigger on push to main of a connected GitHub repo', c: 'gcloud builds triggers create github --name=deploy-main --repo-owner=OWNER --repo-name=REPO_NAME \\\n  --branch-pattern="^main$" --build-config=cloudbuild.yaml --region=REGION' },
            { d: 'Run a trigger manually', c: 'gcloud builds triggers run deploy-main --branch=main --region=REGION' },
            { d: 'List triggers', c: 'gcloud builds triggers list --region=REGION' },
          ],
        },
      ],
    },
  ],
};
