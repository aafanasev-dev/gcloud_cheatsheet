// The REST examples build on shell variables defined once in "Setup & access",
// so every curl below can be pasted as-is after that block.
const VARS = 'PROJECT_ID=$(gcloud config get-value project)\nLOCATION=global\nMODEL=gemini-2.5-flash\nAPI="https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models"';
const AUTH = '-H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json"';

export default {
  id: 'gemini',
  title: 'Gemini AI',
  icon: 'sparkle',
  color: 'ai',
  description: 'Calling Gemini models from the command line through the Gemini Enterprise Agent Platform (formerly Vertex AI) API: text, structured JSON, image understanding and image generation, authenticated with gcloud.',
  useCases: [
    'Captioning, tagging and moderating images stored in Cloud Storage',
    'Generating product descriptions or summaries as structured JSON',
    'Creating or editing images from a text prompt',
    'Prototyping prompts with curl before writing application code',
  ],
  subtopics: [
    {
      id: 'setup',
      title: 'Setup & access',
      icon: 'key',
      summary: 'Enable the API, grant roles, set endpoint variables.',
      description: 'Gemini on Google Cloud is served by `aiplatform.googleapis.com`. Callers need `roles/aiplatform.user`. Requests go to the `global` endpoint unless you need data residency (regional or `eu`/`us` multi-region).',
      useCases: ['Preparing a project for Gemini calls', 'Letting a Cloud Run service account call Gemini', 'Pinning processing to the EU'],
      sections: [
        {
          title: 'Enable & grant',
          cmds: [
            { d: 'Enable the API (billing must be on)', c: 'gcloud services enable aiplatform.googleapis.com' },
            { d: 'Allow a user to call Gemini', c: 'gcloud projects add-iam-policy-binding PROJECT_ID --member=user:alice@example.com --role=roles/aiplatform.user' },
            { d: 'Allow a workload service account to call Gemini', c: 'gcloud projects add-iam-policy-binding PROJECT_ID \\\n  --member=serviceAccount:SA_NAME@PROJECT_ID.iam.gserviceaccount.com --role=roles/aiplatform.user' },
            { d: 'Local credentials for SDKs (ADC)', c: 'gcloud auth application-default login' },
          ],
        },
        {
          title: 'Variables used on every Gemini page',
          note: 'Paste this once per shell. Newer model IDs (e.g. `gemini-3.5-flash`, `gemini-3.1-pro-preview`) can go in `MODEL`; check the model list in the docs for what your project can use.',
          cmds: [
            { d: 'Project, location, model and base URL', c: VARS },
            { d: 'Regional endpoint instead (processing stays in that region)', c: 'LOCATION=europe-west4\nAPI="https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models"' },
            { d: 'EU multi-region endpoint', c: 'LOCATION=eu\nAPI="https://aiplatform.eu.rep.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models"' },
          ],
        },
        {
          title: 'Quotas & monitoring',
          cmds: [
            { d: 'See Gemini quotas for the project', c: 'gcloud beta quotas info list --service=aiplatform.googleapis.com --project=PROJECT_ID --filter="quotaId~generate"' },
            { d: 'Recent Agent Platform API errors in the logs', c: 'gcloud logging read \'protoPayload.serviceName="aiplatform.googleapis.com" AND severity>=ERROR\' --freshness=1d --limit=20' },
          ],
        },
      ],
    },
    {
      id: 'text',
      title: 'Text generation',
      icon: 'message',
      summary: 'generateContent, streaming, system prompts, JSON output.',
      description: 'One endpoint, `:generateContent`, handles every prompt. Add `systemInstruction` for behaviour, `generationConfig` for sampling, and a `responseSchema` to get JSON you can parse.',
      useCases: ['Summaries and product copy', 'Classification into fixed labels', 'Extracting structured fields from free text'],
      sections: [
        {
          title: 'Basic prompts',
          cmds: [
            { d: 'Simple prompt; print only the text', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" \\\n  -d '{"contents":[{"role":"user","parts":[{"text":"Explain Cloud Run in two sentences."}]}]}' \\\n  | jq -r '.candidates[0].content.parts[0].text'` },
            { d: 'System instruction + sampling settings', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "systemInstruction": {"parts":[{"text":"You are a terse SRE. Answer in bullet points."}]},\n  "contents": [{"role":"user","parts":[{"text":"How do I reduce Cloud Run cold starts?"}]}],\n  "generationConfig": {"temperature":0.2, "maxOutputTokens":512}\n}' | jq -r '.candidates[0].content.parts[0].text'` },
            { d: 'Stream the answer as server-sent events', c: `curl -s -N -X POST ${AUTH} "$API/$MODEL:streamGenerateContent?alt=sse" \\\n  -d '{"contents":[{"role":"user","parts":[{"text":"Write a haiku about BigQuery."}]}]}'` },
            { d: 'Count tokens before sending', c: `curl -s -X POST ${AUTH} "$API/$MODEL:countTokens" \\\n  -d '{"contents":[{"role":"user","parts":[{"text":"How many tokens is this?"}]}]}'` },
          ],
        },
        {
          title: 'Structured JSON output',
          cmds: [
            { d: 'Force a JSON object that matches a schema', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[{"text":"Extract the order: 2 copies of Dune for Ada, ship to Berlin."}]}],\n  "generationConfig": {\n    "responseMimeType": "application/json",\n    "responseSchema": {\n      "type": "OBJECT",\n      "properties": {\n        "title": {"type":"STRING"}, "quantity": {"type":"INTEGER"},\n        "customer": {"type":"STRING"}, "city": {"type":"STRING"}\n      },\n      "required": ["title","quantity"]\n    }\n  }\n}' | jq -r '.candidates[0].content.parts[0].text' | jq .` },
            { d: 'Classify into fixed labels (enum)', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[{"text":"Ticket: my VM will not boot after resize"}]}],\n  "generationConfig": {"responseMimeType":"text/x.enum",\n    "responseSchema": {"type":"STRING","enum":["billing","compute","storage","iam","other"]}}\n}' | jq -r '.candidates[0].content.parts[0].text'` },
          ],
        },
      ],
    },
    {
      id: 'vision',
      title: 'Image understanding',
      icon: 'eye',
      summary: 'Caption, tag, OCR and moderate images from GCS or disk.',
      description: 'Gemini is multimodal: put an image part (`fileData` for `gs://` objects, `inlineData` for base64 bytes) next to a text part. The model reads it directly, so no separate Vision API call is needed.',
      useCases: ['Alt-text and captions for uploaded photos', 'Tagging a catalogue for search', 'Reading receipts, labels and screenshots (OCR)', 'Flagging unsafe or off-topic uploads'],
      sections: [
        {
          title: 'Describe an image',
          note: 'The caller (and, for `gs://` URIs, the Agent Platform service agent) needs read access to the object.',
          cmds: [
            { d: 'Caption an image stored in Cloud Storage', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[\n    {"fileData": {"mimeType":"image/jpeg", "fileUri":"gs://BUCKET_NAME/photos/cat.jpg"}},\n    {"text": "Write one-sentence alt text for this image."}\n  ]}]\n}' | jq -r '.candidates[0].content.parts[0].text'` },
            { d: 'Send a local file as base64 (build the body with jq)', c: `jq -n --arg img "$(base64 -w0 receipt.png)" '{contents:[{role:"user",parts:[\n  {inlineData:{mimeType:"image/png",data:$img}},\n  {text:"Transcribe all text on this receipt."}]}]}' > req.json\ncurl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d @req.json | jq -r '.candidates[0].content.parts[0].text'` },
          ],
        },
        {
          title: 'Structured image analysis',
          cmds: [
            { d: 'Tags, caption and a safety verdict as JSON', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[\n    {"fileData": {"mimeType":"image/jpeg", "fileUri":"gs://BUCKET_NAME/uploads/img1.jpg"}},\n    {"text": "Analyse this image for a photo library."}\n  ]}],\n  "generationConfig": {"responseMimeType":"application/json", "responseSchema": {\n    "type":"OBJECT", "properties": {\n      "caption": {"type":"STRING"},\n      "tags": {"type":"ARRAY", "items": {"type":"STRING"}},\n      "safe": {"type":"BOOLEAN"}\n    }, "required": ["caption","tags","safe"]}}\n}' | jq -r '.candidates[0].content.parts[0].text' | jq .` },
            { d: 'Object detection: bounding boxes (0–1000 coordinates)', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[\n    {"fileData": {"mimeType":"image/jpeg", "fileUri":"gs://BUCKET_NAME/shelf.jpg"}},\n    {"text": "Detect every book. Return box_2d as [ymin, xmin, ymax, xmax] normalised to 0-1000 and a label."}\n  ]}],\n  "generationConfig": {"responseMimeType":"application/json"}\n}' | jq -r '.candidates[0].content.parts[0].text'` },
            { d: 'Stricter safety filters on the request', c: `curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[{"fileData":{"mimeType":"image/jpeg","fileUri":"gs://BUCKET_NAME/u/1.jpg"}},{"text":"Describe."}]}],\n  "safetySettings": [\n    {"category":"HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold":"BLOCK_LOW_AND_ABOVE"},\n    {"category":"HARM_CATEGORY_DANGEROUS_CONTENT","threshold":"BLOCK_LOW_AND_ABOVE"}\n  ]\n}' | jq '.candidates[0].finishReason, .candidates[0].safetyRatings'` },
          ],
        },
        {
          title: 'Batch over a bucket',
          cmds: [
            { d: 'Caption every JPEG under a prefix into captions.tsv', c: `for uri in $(gcloud storage ls "gs://BUCKET_NAME/photos/**.jpg"); do\n  body=$(jq -n --arg u "$uri" '{contents:[{role:"user",parts:[{fileData:{mimeType:"image/jpeg",fileUri:$u}},{text:"One short caption."}]}]}')\n  cap=$(curl -s -X POST ${AUTH} "$API/$MODEL:generateContent" -d "$body" | jq -r '.candidates[0].content.parts[0].text')\n  printf '%s\\t%s\\n' "$uri" "$cap" >> captions.tsv\ndone` },
          ],
        },
      ],
    },
    {
      id: 'imagegen',
      title: 'Image generation & editing',
      icon: 'wand',
      summary: 'Create and edit images with Gemini image models.',
      description: 'Image models (`gemini-2.5-flash-image`, newer `gemini-3.1-flash-image`) return pictures as base64 `inlineData` when `responseModalities` includes `IMAGE`. Give them an input image plus instructions to edit it.',
      useCases: ['Product shots and banners from a prompt', 'Background removal / restyling of uploads', 'Thumbnails and placeholder art'],
      sections: [
        {
          title: 'Generate',
          cmds: [
            { d: 'Text → image, saved as PNG', c: `IMG_MODEL=gemini-2.5-flash-image\ncurl -s -X POST ${AUTH} "$API/$IMG_MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[{"text":"A cosy independent bookstore at dusk, watercolour style"}]}],\n  "generationConfig": {"responseModalities":["IMAGE"], "imageConfig": {"aspectRatio":"16:9"}}\n}' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | base64 -d > bookstore.png` },
            { d: 'Get an image and a short explanation together', c: `curl -s -X POST ${AUTH} "$API/$IMG_MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[{"text":"Draw a logo for a pet shop called Paws and describe it in one line"}]}],\n  "generationConfig": {"responseModalities":["TEXT","IMAGE"]}\n}' > resp.json\njq -r '.candidates[0].content.parts[] | select(.text) | .text' resp.json\njq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' resp.json | base64 -d > logo.png` },
          ],
        },
        {
          title: 'Edit an existing image',
          cmds: [
            { d: 'Image + instruction → edited image', c: `jq -n --arg img "$(base64 -w0 dog.jpg)" '{contents:[{role:"user",parts:[\n  {inlineData:{mimeType:"image/jpeg",data:$img}},\n  {text:"Replace the background with a sunny park. Keep the dog unchanged."}]}],\n  generationConfig:{responseModalities:["IMAGE"]}}' > edit.json\ncurl -s -X POST ${AUTH} "$API/$IMG_MODEL:generateContent" -d @edit.json \\\n  | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | base64 -d > dog-park.png` },
            { d: 'Edit an image that lives in Cloud Storage and upload the result', c: `curl -s -X POST ${AUTH} "$API/$IMG_MODEL:generateContent" -d '{\n  "contents": [{"role":"user","parts":[\n    {"fileData":{"mimeType":"image/jpeg","fileUri":"gs://BUCKET_NAME/uploads/room.jpg"}},\n    {"text":"Make it look like a pencil sketch"}]}],\n  "generationConfig": {"responseModalities":["IMAGE"]}\n}' | jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' | base64 -d \\\n  | gcloud storage cp - gs://BUCKET_NAME/variants/room-sketch.png` },
          ],
        },
      ],
    },
    {
      id: 'python-sdk',
      title: 'Python SDK (google-genai)',
      icon: 'python',
      summary: 'Same calls from code, authenticated by ADC.',
      description: 'The `google-genai` package wraps the same API. On Google Cloud it authenticates with Application Default Credentials: your `gcloud auth application-default login` locally, the attached service account on Cloud Run.',
      useCases: ['Moving a curl prototype into an app', 'Cloud Run / Functions code that calls Gemini', 'Embeddings for semantic search'],
      sections: [
        {
          title: 'Install & configure',
          note: 'Recent SDK versions read `GOOGLE_GENAI_USE_ENTERPRISE`; older ones read `GOOGLE_GENAI_USE_VERTEXAI`. Setting both works with either.',
          cmds: [
            { d: 'Install', c: 'pip install --upgrade google-genai' },
            { d: 'Point the SDK at your project', c: 'export GOOGLE_CLOUD_PROJECT=PROJECT_ID\nexport GOOGLE_CLOUD_LOCATION=global\nexport GOOGLE_GENAI_USE_ENTERPRISE=True\nexport GOOGLE_GENAI_USE_VERTEXAI=True' },
            { d: 'Pass the same variables to a Cloud Run service', c: 'gcloud run services update SERVICE --region=REGION \\\n  --update-env-vars=GOOGLE_CLOUD_PROJECT=PROJECT_ID,GOOGLE_CLOUD_LOCATION=global,GOOGLE_GENAI_USE_ENTERPRISE=True,GOOGLE_GENAI_USE_VERTEXAI=True' },
          ],
        },
        {
          title: 'Snippets',
          cmds: [
            { d: 'Text', c: 'from google import genai\n\nclient = genai.Client()\nresp = client.models.generate_content(model="gemini-2.5-flash", contents="Explain IAM conditions briefly.")\nprint(resp.text)' },
            { d: 'Image from Cloud Storage → JSON', c: 'from google import genai\nfrom google.genai import types\nfrom pydantic import BaseModel\n\nclass Analysis(BaseModel):\n    caption: str\n    tags: list[str]\n    safe: bool\n\nclient = genai.Client()\nresp = client.models.generate_content(\n    model="gemini-2.5-flash",\n    contents=[types.Part.from_uri(file_uri="gs://BUCKET_NAME/img.jpg", mime_type="image/jpeg"),\n              "Analyse this image for a photo library."],\n    config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Analysis),\n)\nprint(resp.parsed)' },
            { d: 'Generate an image', c: 'from google import genai\nfrom google.genai import types\n\nclient = genai.Client()\nresp = client.models.generate_content(\n    model="gemini-2.5-flash-image",\n    contents="A golden retriever puppy in a bookshop, photo",\n    config=types.GenerateContentConfig(response_modalities=["IMAGE"]),\n)\nfor part in resp.candidates[0].content.parts:\n    if part.inline_data:\n        open("puppy.png", "wb").write(part.inline_data.data)' },
            { d: 'Embeddings', c: 'from google import genai\n\nclient = genai.Client()\nresp = client.models.embed_content(model="gemini-embedding-001", contents=["cloud storage bucket", "object store"])\nprint([len(e.values) for e in resp.embeddings])' },
          ],
        },
      ],
    },
    {
      id: 'api-keys',
      title: 'Gemini API keys (AI Studio)',
      icon: 'apikey',
      summary: 'Developer API with a restricted key instead of IAM.',
      description: 'The Gemini Developer API (`generativelanguage.googleapis.com`) authenticates with an API key instead of IAM. It suits quick experiments and client-side prototypes; for production on GCP, prefer the IAM-based endpoint above.',
      useCases: ['Hackathon prototypes', 'Tools that cannot use Google credentials', 'Separating AI spend into its own project'],
      sections: [
        {
          title: 'Key & call',
          cmds: [
            { d: 'Enable the Developer API', c: 'gcloud services enable generativelanguage.googleapis.com' },
            { d: 'Create a key that only works for Gemini', c: 'gcloud services api-keys create --display-name="gemini-dev" --api-target=service=generativelanguage.googleapis.com' },
            { d: 'Fetch the key string', c: 'GEMINI_API_KEY=$(gcloud services api-keys get-key-string KEY_ID --format="value(keyString)")' },
            { d: 'Call the model with the key', c: 'curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \\\n  -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \\\n  -d \'{"contents":[{"parts":[{"text":"Hello from the CLI"}]}]}\' | jq -r \'.candidates[0].content.parts[0].text\'' },
          ],
        },
      ],
    },
  ],
};
