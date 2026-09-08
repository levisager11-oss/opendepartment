type Choices = {
  name: string;
  subjectLabel: string;
  docket: string;
  openJoin: boolean;
  operatorName: string;
  operatorContact: string;
  bootstrapHash: string;
};

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Only the capability's digest crosses into copied SQL or the provisioning server. */
export function personalizeTenantSchema(schema: string, opts: Choices): string {
  if (!/^[0-9a-f]{64}$/.test(opts.bootstrapHash)) throw new Error("INVALID_BOOTSTRAP_HASH");
  const name = opts.name.trim() || "The Department";
  const operatorName = opts.operatorName.trim();
  const operatorContact = opts.operatorContact.trim();
  return `${schema}
-- Your department settings and private founder-verification digest.
-- Keep the founder link from the wizard; it is not included in this SQL.
begin;
-- Serialize personalization with signup so an already claimed tenant stays claimed.
select id from public.settings where id for update;
update public.settings set
  department_name = ${quote(name)},
  subject_label = ${quote(opts.subjectLabel.trim() || "Case")},
  docket_prefix = ${quote(opts.docket.trim().toUpperCase() || "CF")},
  seal_top = ${quote(name.toUpperCase())},
  seal_bottom = 'OFFICIAL USE ONLY',
  operator_name = ${operatorName ? quote(operatorName) : "operator_name"},
  operator_contact = ${operatorContact ? quote(operatorContact) : "operator_contact"},
  open_join = ${opts.openJoin}
where id;
insert into public.department_bootstrap (id, secret_hash)
select true, '${opts.bootstrapHash}'
where exists (select 1 from public.settings where id and not claimed)
on conflict (id) do update set secret_hash = excluded.secret_hash;
commit;
`;
}
