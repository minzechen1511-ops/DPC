interface ProfileSync {
  read:()=>Promise<Record<string,unknown>|null>;
  create:(values:Record<string,unknown>)=>Promise<void>;
  update:(values:Record<string,unknown>)=>Promise<void>;
  values:Record<string,unknown>;
  readOnlyIfExists?:boolean;
}
/** An existing workspace can open without spending profile write quota.
 * New profiles still must be created successfully before private project reads. */
export async function ensureProfileRecord({read,create,update,values,readOnlyIfExists}:ProfileSync) {
  const existing=await read();
  if (!existing) {await create(values);return;}
  if (readOnlyIfExists) return;
  const changed=Object.fromEntries(Object.entries(values).filter(([key,value])=>existing[key]!==value));
  if (Object.keys(changed).length) await update(changed);
}
