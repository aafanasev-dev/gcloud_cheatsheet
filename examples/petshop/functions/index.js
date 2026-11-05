// Petshop: two Cloud Functions (2nd gen) sharing one source folder.
//   petsApi    - HTTP API behind API Gateway: list/add/adopt pets (Firestore)
//   onAdoption - Pub/Sub-triggered worker that records adoptions and notifies
// New pets that come with a photo in Cloud Storage get an adoption profile
// written by Gemini from the picture.
const functions = require('@google-cloud/functions-framework');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { PubSub } = require('@google-cloud/pubsub');
const { GoogleGenAI, Type } = require('@google/genai');

const MODEL = process.env.MODEL || 'gemini-2.5-flash';
const TOPIC = process.env.ADOPTIONS_TOPIC || 'adoptions';

const db = new Firestore();
const pubsub = new PubSub();
const pets = db.collection('pets');

let ai;
const gemini = () =>
  (ai ??= new GoogleGenAI({
    enterprise: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'global',
  }));

const PROFILE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: 'Warm 2-3 sentence adoption profile' },
    breedGuess: { type: Type.STRING },
    temperament: { type: Type.ARRAY, items: { type: Type.STRING } },
    isPet: { type: Type.BOOLEAN, description: 'False if the photo does not show an animal' },
  },
  required: ['description', 'temperament', 'isPet'],
};

async function describePhoto(photoUri, name, species) {
  const resp = await gemini().models.generateContent({
    model: MODEL,
    contents: [
      { fileData: { fileUri: photoUri, mimeType: photoUri.endsWith('.png') ? 'image/png' : 'image/jpeg' } },
      { text: `This is ${name}, a ${species} at our shelter. Write an adoption profile from the photo.` },
    ],
    config: { responseMimeType: 'application/json', responseSchema: PROFILE_SCHEMA },
  });
  return JSON.parse(resp.text);
}

const toPet = (doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.get('createdAt')?.toDate?.() });

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function listPets(req) {
  let q = pets.where('status', '==', 'available');
  if (req.query.species) q = q.where('species', '==', String(req.query.species));
  const snap = await q.orderBy('createdAt', 'desc').limit(50).get();
  return snap.docs.map(toPet);
}

async function getPet(id) {
  const doc = await pets.doc(id).get();
  if (!doc.exists) throw new HttpError(404, 'pet not found');
  return toPet(doc);
}

async function createPet(req) {
  const { name, species, age, photo } = req.body || {};
  if (!name || !species) throw new HttpError(400, 'name and species are required');
  if (photo && !/^gs:\/\/[^/]+\/.+\.(jpe?g|png)$/i.test(photo)) throw new HttpError(400, 'photo must be a gs:// JPEG or PNG');

  const pet = { name, species, age: age ?? null, photo: photo ?? null, status: 'available', createdAt: FieldValue.serverTimestamp() };
  if (photo) {
    const profile = await describePhoto(photo, name, species);
    if (!profile.isPet) throw new HttpError(422, 'the photo does not seem to show a pet');
    Object.assign(pet, { description: profile.description, breedGuess: profile.breedGuess ?? null, temperament: profile.temperament });
  }
  const ref = await pets.add(pet);
  return getPet(ref.id);
}

async function adoptPet(id, req) {
  const adopter = req.body?.adopter;
  if (!adopter) throw new HttpError(400, 'adopter is required');
  const ref = pets.doc(id);
  const pet = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new HttpError(404, 'pet not found');
    if (doc.get('status') !== 'available') throw new HttpError(409, 'already adopted');
    tx.update(ref, { status: 'adopted', adopter, adoptedAt: FieldValue.serverTimestamp() });
    return toPet(doc);
  });
  const event = { petId: id, name: pet.name, species: pet.species, adopter, at: new Date().toISOString() };
  await pubsub.topic(TOPIC).publishMessage({ json: event, attributes: { type: 'pet.adopted' } });
  return { ...event, status: 'adopted' };
}

// API Gateway appends the request path to the function URL, so route on it here.
functions.http('petsApi', async (req, res) => {
  try {
    const parts = req.path.split('/').filter(Boolean); // e.g. ["pets", "abc", "adopt"]
    if (parts[0] !== 'pets') throw new HttpError(404, 'not found');
    let body;
    if (parts.length === 1 && req.method === 'GET') body = await listPets(req);
    else if (parts.length === 1 && req.method === 'POST') { body = await createPet(req); res.status(201); }
    else if (parts.length === 2 && req.method === 'GET') body = await getPet(parts[1]);
    else if (parts.length === 3 && parts[2] === 'adopt' && req.method === 'POST') body = await adoptPet(parts[1], req);
    else throw new HttpError(404, 'not found');
    res.json(body);
  } catch (err) {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'internal error' });
  }
});

// Pub/Sub delivers a CloudEvent whose message data is base64-encoded JSON.
functions.cloudEvent('onAdoption', async (cloudEvent) => {
  const event = JSON.parse(Buffer.from(cloudEvent.data.message.data, 'base64').toString());
  await db.collection('adoptions').doc(event.petId).set({ ...event, notifiedAt: FieldValue.serverTimestamp() });
  // Structured log line; a real shop would send an email here.
  console.log(JSON.stringify({ severity: 'NOTICE', message: `Congratulations ${event.adopter} on adopting ${event.name}!`, event }));
});
