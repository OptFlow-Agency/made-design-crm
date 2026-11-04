// @vitest-environment node
import config from '@/payload.config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

describe('first admin and store staff management', () => {
  let payload: Payload
  const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`
  let root: any, bootstrap: any
  let storeA: any, storeB: any, adminA: any
  const extraUsers: string[] = []
  const tenants: string[] = []

  const as = async (id: string) => ({ ...(await payload.findByID({ collection: 'users', id, depth: 0 })), collection: 'users' }) as never
  const rowsOf = async (id: string) => ((await payload.findByID({ collection: 'users', id, depth: 0 })).tenants ?? []).map((r: any) => r.tenant)
  const email = (n: string) => `zz-${n}-${stamp}@example.test`

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    if ((await payload.count({ collection: 'users' })).totalDocs === 0)
      bootstrap = await payload.create({ collection: 'users', data: { email: email('boot'), password: 'Test-pass-123!' } as never })
    // `root` stands for a platform admin (the Made Design team).
    root = await payload.create({ collection: 'users', data: { email: email('root0'), password: 'Test-pass-123!', roles: ['admin'] } as never })
    storeB = await payload.create({ collection: 'tenants', data: { name: 'ZZ Store B', slug: `zz-b-${stamp}` } as never })
    tenants.push(storeB.id)
  })

  afterAll(async () => {
    for (const id of extraUsers) await payload.delete({ collection: 'users', id }).catch(() => null)
    for (const id of [adminA?.id, root?.id, bootstrap?.id]) if (id) await payload.delete({ collection: 'users', id }).catch(() => null)
    for (const id of tenants) if (id) await payload.delete({ collection: 'tenants', id }).catch(() => null)
  })

  it('creating a store with first-admin details also creates its admin, without storing the password on the tenant', async () => {
    storeA = await payload.create({
      collection: 'tenants',
      data: { name: 'ZZ Store A', slug: `zz-a-${stamp}`, adminName: 'Sara', adminEmail: email('a').toUpperCase(), adminPassword: 'Str0ng-first-pass' } as never,
      user: await as(root.id), overrideAccess: false, depth: 0,
    })
    tenants.push(storeA.id)
    expect(JSON.stringify(storeA)).not.toContain('Str0ng')
    const found = await payload.find({ collection: 'users', where: { email: { equals: email('a') } }, depth: 0 })
    adminA = found.docs[0]
    expect(adminA.roles).toEqual(['tenant-admin'])
    expect(await rowsOf(adminA.id)).toEqual([storeA.id])
    const login = await payload.login({ collection: 'users', data: { email: email('a'), password: 'Str0ng-first-pass' } })
    expect(login.token).toBeTruthy()
  })

  it('bad first-admin input rejects the whole creation (no orphan tenant)', async () => {
    await expect(payload.create({ collection: 'tenants', data: { name: 'ZZ Bad', slug: `zz-bad-${stamp}`, adminEmail: 'nope', adminPassword: 'Str0ng-first-pass' } as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'tenants', data: { name: 'ZZ Bad', slug: `zz-bad-${stamp}`, adminEmail: email('x'), adminPassword: 'short' } as never })).rejects.toThrow()
    await expect(payload.create({ collection: 'tenants', data: { name: 'ZZ Bad', slug: `zz-bad-${stamp}`, adminEmail: email('a'), adminPassword: 'Str0ng-first-pass' } as never })).rejects.toThrow() // email taken
    expect((await payload.count({ collection: 'tenants', where: { slug: { equals: `zz-bad-${stamp}` } } })).totalDocs).toBe(0)
  })

  it('the store admin can add and edit staff for their own store only', async () => {
    const me = await as(adminA.id)
    const staff: any = await payload.create({
      collection: 'users',
      data: { email: email('s1'), password: 'Test-pass-123!', roles: ['admin'], tenants: [{ tenant: storeA.id }, { tenant: storeB.id }] } as never, // attempted escalation
      user: me, overrideAccess: false, depth: 0,
    })
    extraUsers.push(staff.id)
    expect(await rowsOf(staff.id)).toEqual([storeA.id])
    const full = await payload.findByID({ collection: 'users', id: staff.id, depth: 0 })
    expect(full.roles).toEqual(['staff']) // 'admin' is not theirs to grant; downgraded to the least-privileged role

    const renamed = await payload.update({ collection: 'users', id: staff.id, data: { name: 'Renamed' } as never, user: me, overrideAccess: false })
    expect(renamed.name).toBe('Renamed')
    // Naming a store they have no access to (not something the form can do: the field is hidden) is refused outright.
    await expect(payload.create({ collection: 'users', data: { email: email('s2'), password: 'Test-pass-123!', tenants: [{ tenant: storeB.id }] } as never, user: me, overrideAccess: false })).rejects.toThrow()
  })

  it('a user created without choosing a store joins the creator’s store', async () => {
    const u: any = await payload.create({ collection: 'users', data: { email: email('s5'), password: 'Test-pass-123!' } as never, user: await as(adminA.id), overrideAccess: false })
    extraUsers.push(u.id)
    expect(await rowsOf(u.id)).toEqual([storeA.id])
  })

  it('a platform admin creating a user inside a store view puts them in that store (but not other admins)', async () => {
    const rootUser = await payload.create({ collection: 'users', data: { email: email('root'), password: 'Test-pass-123!', roles: ['admin'] } as never })
    extraUsers.push(rootUser.id)
    const headers = new Headers({ cookie: `payload-tenant=${storeA.id}` })
    const req: any = { payload, user: { ...rootUser, collection: 'users' }, headers, context: {}, transactionID: undefined }
    const u: any = await payload.create({ collection: 'users', data: { email: email('s6'), password: 'Test-pass-123!' } as never, req })
    extraUsers.push(u.id)
    expect(await rowsOf(u.id)).toEqual([storeA.id])
    const a: any = await payload.create({ collection: 'users', data: { email: email('s7'), password: 'Test-pass-123!', roles: ['admin'] } as never, req })
    extraUsers.push(a.id)
    expect(await rowsOf(a.id)).toEqual([])
  })

  it('a store admin cannot touch other stores’ users, privileged users, or escalate themselves', async () => {
    const me = await as(adminA.id)
    await expect(payload.update({ collection: 'users', id: root.id, data: { name: 'x' } as never, user: me, overrideAccess: false })).rejects.toThrow()
    await payload.update({ collection: 'users', id: adminA.id, data: { roles: ['admin'], tenants: [{ tenant: storeA.id }, { tenant: storeB.id }] } as never, user: me, overrideAccess: false })
    const after = await payload.findByID({ collection: 'users', id: adminA.id, depth: 0 })
    expect(after.roles).toEqual(['tenant-admin'])
    expect(await rowsOf(adminA.id)).toEqual([storeA.id])
    await expect(payload.delete({ collection: 'users', id: adminA.id, user: me, overrideAccess: false })).rejects.toThrow() // not self
  })

  it('a store admin can remove store staff', async () => {
    const me = await as(adminA.id)
    const s: any = await payload.create({ collection: 'users', data: { email: email('s3'), password: 'Test-pass-123!', tenants: [{ tenant: storeA.id }] } as never, user: me, overrideAccess: false })
    await payload.delete({ collection: 'users', id: s.id, user: me, overrideAccess: false })
    expect((await payload.count({ collection: 'users', where: { id: { equals: s.id } } })).totalDocs).toBe(0)
  })

  it('only platform admins can create tenants', async () => {
    await expect(payload.create({ collection: 'tenants', data: { name: 'nope', slug: `zz-nope-${stamp}` } as never, user: await as(adminA.id), overrideAccess: false })).rejects.toThrow()
    const ok: any = await payload.create({ collection: 'tenants', data: { name: 'ZZ Ok', slug: `zz-ok-${stamp}` } as never, user: await as(root.id), overrideAccess: false })
    tenants.push(ok.id)
  })
})
