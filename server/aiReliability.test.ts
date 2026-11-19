import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createAiRouter} from './ai/aiRoutes.ts';
import {parseOpenRouterModelCatalog} from './ai/openrouterAuth.ts';
import {UVZ_RESPONSE_SCHEMA,requireGeneratedText} from './ai/structuredGeneration.ts';
import {LocalStore} from './db/localStore.ts';
import {loadConfig} from './config.ts';
import {decryptSecret} from './security/crypto.ts';

test('live catalog retains late free models and does not round cheap or missing prices down to free', () => {
  const paid=Array.from({length:70},(_,i)=>({id:`provider/paid-${i}`,pricing:{prompt:'0.000000001',completion:'0.000000002'}}));
  const models=parseOpenRouterModelCatalog([...paid,{id:'provider/late:free',pricing:{prompt:'0',completion:'0'}},{id:'provider/unknown',pricing:{}},{id:'provider/image',pricing:{prompt:'0',completion:'0'},architecture:{output_modalities:['image']}}]);
  assert.equal(models[0].id,'provider/late:free');
  assert.equal(models.filter(model=>model.isFree).length,1);
  assert.equal(models.length,72);
});

test('structured UVZ contract requires three suggestions and rejects truncated, blocked and malformed output', () => {
  assert.equal(UVZ_RESPONSE_SCHEMA.properties.positioningOptions.minItems,3);
  for (const [response,code] of [
    [{text:'{"unfinished":',candidates:[{finishReason:'MAX_TOKENS'}]},'AI_OUTPUT_TRUNCATED'],
    [{text:'',promptFeedback:{blockReason:'SAFETY'}},'AI_OUTPUT_BLOCKED'],
    [{text:'not json'},'INVALID_AI_JSON'],
    [{text:''},'EMPTY_AI_RESPONSE'],
  ] as const) assert.throws(()=>requireGeneratedText(response,true),{code});
});

test('OpenRouter key verification is authenticated, encrypted, user-scoped and used for the chosen free model', async () => {
  const key='sk-or-v1-test-only-canary-123456789';
  const config=loadConfig({NODE_ENV:'test',CREDENTIAL_ENCRYPTION_KEY:'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'});
  const store=new LocalStore(':memory:');await store.init();
  let observedModel='';
  const app=express();app.use(express.json());
  app.use('/ai',createAiRouter({store,config,verifyToken:async token=>{if(token!=='test-user')throw new Error('Unauthorized');return {uid:'owner',email:'owner@example.test',emailVerified:true};},openrouterKeyInfoFn:async raw=>({valid:raw===key}),openrouterModelsFn:async()=>parseOpenRouterModelCatalog([{id:'provider/late:free',pricing:{prompt:'0',completion:'0'}}]),openrouterChatFn:async request=>{assert.equal(request.apiKey,key);observedModel=request.model;return {model:request.model,choices:[{message:{content:'A real route test double'},finish_reason:'stop'}]};}}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.on('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}/ai`;
  const headers={'content-type':'application/json',authorization:'Bearer test-user'};
  try {
    assert.equal((await fetch(`${base}/openrouter/key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:key})})).status,401);
    const save=await fetch(`${base}/openrouter/key`,{method:'POST',headers,body:JSON.stringify({apiKey:key})});assert.equal(save.status,200);assert.ok(!(await save.text()).includes(key));
    const stored=(await store.getCredential('owner','openrouter'))!;
    assert.equal(decryptSecret(stored,config.credentialEncryptionKey),key);
    assert.ok(!JSON.stringify(stored).includes(key));assert.equal(await store.getCredential('other-user','openrouter'),null);
    const rejected=await fetch(`${base}/openrouter/key`,{method:'POST',headers,body:JSON.stringify({apiKey:'invalid-key-that-is-long-enough'})});assert.equal(rejected.status,401);
    assert.equal((await store.getCredential('owner','openrouter'))!.ciphertext,stored.ciphertext);
    const catalog=await (await fetch(`${base}/models`)).json();assert.ok(catalog.openrouterModels.some((m:any)=>m.id==='provider/late:free'));
    const chat=await fetch(`${base}/chat`,{method:'POST',headers,body:JSON.stringify({provider:'openrouter',model:'provider/late:free',messages:[{role:'user',content:'Test'}]})});assert.equal(chat.status,200);assert.equal(observedModel,'provider/late:free');assert.equal((await chat.json()).provider,'openrouter');
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await store.close();}
});
