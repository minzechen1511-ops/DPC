import fs from 'node:fs/promises';
const base = process.argv[2] || 'http://127.0.0.1:3101';
await fs.mkdir('audit/results', {recursive:true});
for (const [name,endpoint,method] of [['health','/api/health','GET'],['market','/api/market/research','GET'],['directory','/api/market/resources/check','POST'],['frontend','/','GET']]) {
  const result={url:base+endpoint,checkedAt:new Date().toISOString(),runtime:'local audit server; not deployed Cloud Run'};
  try {
    const response=await fetch(result.url,{method,signal:AbortSignal.timeout(45000)});
    result.status=response.status;result.contentType=response.headers.get('content-type');
    const body=await response.text();
    if(result.contentType?.includes('application/json'))result.response=JSON.parse(body);
    else result.body=body;
  } catch(error){result.error=String(error);}
  await fs.writeFile(`audit/results/local-${name}.json`,JSON.stringify(result,null,2));
  console.log(name, JSON.stringify(result.response?.sources || result.response?.resources || {...result,body:undefined}));
}
