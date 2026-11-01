import { Client, createTestApp, registerClient, TestApp } from '../helpers/app';

type Task = { id: string; title: string; status: string; priority: string; dueDate: string | null; isOverdue: boolean; completedAt: string | null; description: string | null };

describe('Tâches (E2E)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterEach(() => t.clock.reset());
  afterAll(() => t.close());

  const create = async (client: Client, body: object): Promise<Task> => {
    const res = await client.post('/tasks', body);
    if (res.status !== 201) throw new Error(`${res.status} ${JSON.stringify(res.body)}`);
    return res.body as Task;
  };

  it('T11 — création sans priorité/statut → MEDIUM et TODO ; titre trimé ; sans échéance', async () => {
    const { client } = await registerClient(t.app);
    const task = await create(client, { title: '  Préparer le brief  ' });
    expect(task).toMatchObject({ title: 'Préparer le brief', status: 'TODO', priority: 'MEDIUM', dueDate: null, description: null, isOverdue: false, completedAt: null });
    expect(Object.keys(task)).not.toContain('ownerId');
  });

  it('création avec échéance et directement en DONE → completedAt renseigné', async () => {
    const { client } = await registerClient(t.app);
    const task = await create(client, { title: 'Déjà fait', status: 'DONE', priority: 'HIGH', dueDate: '2026-11-12', description: 'Valider les écrans' });
    expect(task).toMatchObject({ status: 'DONE', priority: 'HIGH', dueDate: '2026-11-12', description: 'Valider les écrans' });
    expect(task.completedAt).not.toBeNull();
  });

  it('T12 — titre espaces, date impossible, champ inconnu → 400 détaillé', async () => {
    const { client } = await registerClient(t.app);
    const blank = await client.post('/tasks', { title: '    ' });
    expect(blank.status).toBe(400);
    expect(blank.body.details.title).toBeDefined();

    const date = await client.post('/tasks', { title: 'x', dueDate: '2026-02-30' });
    expect(date.status).toBe(400);
    expect(date.body.details.dueDate).toBeDefined();
    for (const bad of ['2026-13-01', '26-01-01', '2026-11-12T00:00:00Z', 20261112]) {
      expect((await client.post('/tasks', { title: 'x', dueDate: bad })).status).toBe(400);
    }
    expect((await client.post('/tasks', { title: 'x', dueDate: '2028-02-29' })).status).toBe(201); // année bissextile

    const owner = await client.post('/tasks', { title: 'x', ownerId: 'someone' });
    expect(owner.status).toBe(400);
    expect(owner.body.details.ownerId).toEqual(['Champ non autorisé']);
    for (const field of ['completedAt', 'createdAt', 'isOverdue', 'id']) {
      expect((await client.post('/tasks', { title: 'x', [field]: '2026-01-01' })).status).toBe(400);
    }
    expect((await client.post('/tasks', { title: 'a'.repeat(151) })).status).toBe(400);
    expect((await client.post('/tasks', { title: 'a'.repeat(150) })).status).toBe(201);
    expect((await client.post('/tasks', { title: 'x', description: 'd'.repeat(2001) })).status).toBe(400);
    expect((await client.post('/tasks', { title: 'x', status: 'ARCHIVED' })).status).toBe(400);
    expect((await client.post('/tasks', { title: 'x', priority: 'URGENT' })).status).toBe(400);
  });

  it('PATCH partiel : seuls les champs présents changent ; null efface ; corps vide refusé', async () => {
    const { client } = await registerClient(t.app);
    const task = await create(client, { title: 'Initial', description: 'Desc', priority: 'LOW', dueDate: '2026-12-01' });
    const res = await client.patch(`/tasks/${task.id}`, { priority: 'HIGH' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Initial', description: 'Desc', priority: 'HIGH', dueDate: '2026-12-01' });

    const cleared = await client.patch(`/tasks/${task.id}`, { description: null, dueDate: null, title: ' Nouveau ' });
    expect(cleared.body).toMatchObject({ title: 'Nouveau', description: null, dueDate: null });

    expect((await client.patch(`/tasks/${task.id}`, {})).status).toBe(400);
    expect((await client.patch(`/tasks/${task.id}`, { title: null })).status).toBe(400);
    expect((await client.patch(`/tasks/${task.id}`, { status: null })).status).toBe(400);
    expect((await client.patch(`/tasks/${task.id}`, { completedAt: null })).status).toBe(400);
  });

  it('T13 — passage à DONE puis TODO : completedAt défini puis vidé ; conservé sur autre modif', async () => {
    const { client } = await registerClient(t.app);
    const task = await create(client, { title: 'Cycle' });
    t.clock.set('2026-11-01T10:00:00.000Z');
    const done = (await client.patch(`/tasks/${task.id}`, { status: 'DONE' })).body as Task;
    expect(done.completedAt).toBe('2026-11-01T10:00:00.000Z');
    t.clock.set('2026-11-02T10:00:00.000Z');
    const edited = (await client.patch(`/tasks/${task.id}`, { title: 'Cycle renommé', status: 'DONE' })).body as Task;
    expect(edited.completedAt).toBe('2026-11-01T10:00:00.000Z');
    const reopened = (await client.patch(`/tasks/${task.id}`, { status: 'IN_PROGRESS' })).body as Task;
    expect(reopened.completedAt).toBeNull();
    const back = (await client.patch(`/tasks/${task.id}`, { status: 'TODO' })).body as Task;
    expect(back.status).toBe('TODO');
  });

  it('T14/T15 — retard selon le fuseau du compte ; DONE jamais en retard ; échéance du jour non en retard', async () => {
    // 2026-11-01T23:30Z : déjà le 2 novembre à Porto-Novo (UTC+1), encore le 1er à UTC.
    t.clock.set('2026-11-01T23:30:00.000Z');
    const { client: benin } = await registerClient(t.app, { timeZone: 'Africa/Porto-Novo' });
    const { client: utc } = await registerClient(t.app, { timeZone: 'UTC' });

    const b = await create(benin, { title: 'Hier au Bénin', dueDate: '2026-11-01' });
    const u = await create(utc, { title: "Aujourd'hui à UTC", dueDate: '2026-11-01' });
    expect(b.isOverdue).toBe(true);
    expect(u.isOverdue).toBe(false);

    const doneLate = await create(benin, { title: 'Terminée en retard', dueDate: '2026-10-01', status: 'DONE' });
    expect(doneLate.isOverdue).toBe(false);
    const noDate = await create(benin, { title: 'Sans échéance' });
    expect(noDate.isOverdue).toBe(false);

    const stats = (await benin.get('/tasks/stats').expect(200)).body;
    expect(stats.overdue).toBe(1);
    const overdue = (await benin.get('/tasks?due=overdue').expect(200)).body;
    expect(overdue.items.map((x: Task) => x.title)).toEqual(['Hier au Bénin']);
  });

  it('frontières de mois, d’année et changement d’heure', async () => {
    const { client, user } = await registerClient(t.app, { timeZone: 'Europe/Paris' });
    // Les sauts d'horloge dépassent la durée de session : on la prolonge pour ce test.
    await t.prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date('2030-01-01') } });
    const eoy = await create(client, { title: 'Réveillon', dueDate: '2026-12-31' });
    t.clock.set('2026-12-31T22:59:59.000Z'); // 23:59:59 à Paris
    expect((await client.get(`/tasks/${eoy.id}`)).body.isOverdue).toBe(false);
    t.clock.set('2026-12-31T23:00:00.000Z'); // 00:00 le 1er janvier à Paris
    expect((await client.get(`/tasks/${eoy.id}`)).body.isOverdue).toBe(true);

    const dst = await create(client, { title: 'Passage heure d’hiver', dueDate: '2026-10-25' });
    t.clock.set('2026-10-25T22:59:00.000Z'); // 23:59 heure d’hiver (UTC+1)
    expect((await client.get(`/tasks/${dst.id}`)).body.isOverdue).toBe(false);
    t.clock.set('2026-10-25T23:00:00.000Z');
    expect((await client.get(`/tasks/${dst.id}`)).body.isOverdue).toBe(true);

    const feb = await create(client, { title: 'Fin février', dueDate: '2026-02-28' });
    t.clock.set('2026-02-28T23:30:00.000Z'); // 1er mars 00:30 à Paris
    expect((await client.get(`/tasks/${feb.id}`)).body.isOverdue).toBe(true);
  });

  it('T10 — B ne peut ni lire, ni modifier, ni supprimer la tâche de A (404 identique)', async () => {
    const { client: a } = await registerClient(t.app);
    const { client: b } = await registerClient(t.app);
    const task = await create(a, { title: 'Privée de A' });
    const missing = '00000000-0000-4000-8000-000000000000';

    const read = await b.get(`/tasks/${task.id}`);
    const readMissing = await b.get(`/tasks/${missing}`);
    expect(read.status).toBe(404);
    expect(readMissing.status).toBe(404);
    expect(read.body.message).toBe(readMissing.body.message);
    expect((await b.patch(`/tasks/${task.id}`, { title: 'Piratée' })).status).toBe(404);
    expect((await b.delete(`/tasks/${task.id}`)).status).toBe(404);
    expect((await b.get('/tasks/not-a-uuid')).status).toBe(404);
    expect((await b.get('/tasks')).body.items).toHaveLength(0);
    expect((await b.get('/tasks/stats')).body.total).toBe(0);
    expect((await b.get(`/tasks?search=${encodeURIComponent('Privée')}`)).body.items).toHaveLength(0);

    const intact = (await a.get(`/tasks/${task.id}`).expect(200)).body as Task;
    expect(intact.title).toBe('Privée de A');
  });

  it('T21 — suppression : 204 puis 404, définitive', async () => {
    const { client } = await registerClient(t.app);
    const task = await create(client, { title: 'À supprimer' });
    expect((await client.delete(`/tasks/${task.id}`)).status).toBe(204);
    expect((await client.get(`/tasks/${task.id}`)).status).toBe(404);
    expect((await client.delete(`/tasks/${task.id}`)).status).toBe(404);
    expect(await t.prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });

  describe('T16 — liste paginée, recherche, filtres, tri', () => {
    let client: Client;
    beforeAll(async () => {
      ({ client } = await registerClient(t.app, { timeZone: 'UTC' }));
      t.clock.set('2026-11-01T12:00:00.000Z');
      const specs = [
        { title: 'Écrire le rapport', priority: 'HIGH', dueDate: '2026-10-20' },
        { title: 'ecrire un email', priority: 'LOW', status: 'DONE', dueDate: '2026-10-10' },
        { title: 'Réunion équipe', priority: 'MEDIUM', description: 'Préparer le RAPPORT trimestriel' },
        { title: 'Budget 100% validé', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: '2026-11-15' },
        { title: 'Appeler_le_client', priority: 'LOW', dueDate: '2026-11-15' },
      ];
      for (const [i, spec] of specs.entries()) {
        t.clock.set(new Date(Date.UTC(2026, 9, 1 + i)).toISOString());
        await create(client, spec);
      }
      for (let i = 0; i < 20; i++) {
        t.clock.set(new Date(Date.UTC(2026, 9, 10, i)).toISOString());
        await create(client, { title: `Lot ${String(i).padStart(2, '0')}`, priority: 'MEDIUM' });
      }
      t.clock.set('2026-11-01T12:00:00.000Z');
    });

    it('pagination : total juste, pages disjointes, ordre stable', async () => {
      const p1 = (await client.get('/tasks?limit=10&page=1').expect(200)).body;
      const p3 = (await client.get('/tasks?limit=10&page=3').expect(200)).body;
      expect(p1.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3, hasNextPage: true });
      expect(p3.pagination).toMatchObject({ page: 3, total: 25, hasNextPage: false });
      expect(p3.items).toHaveLength(5);
      const all = (await client.get('/tasks?limit=100').expect(200)).body.items.map((x: Task) => x.id);
      const paged: string[] = [];
      for (let page = 1; page <= 3; page++) paged.push(...(await client.get(`/tasks?limit=10&page=${page}`)).body.items.map((x: Task) => x.id));
      expect(paged).toEqual(all);
      expect(new Set(paged).size).toBe(25);
      expect((await client.get('/tasks?page=9').expect(200)).body.items).toHaveLength(0);
    });

    it('recherche insensible à la casse et aux accents, titre et description, jokers littéraux', async () => {
      const titles = async (q: string) => (await client.get(`/tasks?search=${encodeURIComponent(q)}&sortBy=title&sortOrder=asc`).expect(200)).body.items.map((x: Task) => x.title);
      expect(await titles('ECRIRE')).toEqual(['Écrire le rapport', 'ecrire un email']);
      expect(await titles('rapport')).toEqual(['Écrire le rapport', 'Réunion équipe']);
      expect(await titles('100%')).toEqual(['Budget 100% validé']);
      expect(await titles('%')).toEqual(['Budget 100% validé']);
      expect(await titles('_')).toEqual(['Appeler_le_client']);
      expect(await titles('introuvable')).toEqual([]);
      expect((await client.get(`/tasks?search=${'a'.repeat(101)}`)).status).toBe(400);
    });

    it('filtres combinés par ET', async () => {
      const q = async (qs: string) => (await client.get(`/tasks?limit=100&${qs}`).expect(200)).body;
      expect((await q('status=DONE')).pagination.total).toBe(1);
      expect((await q('priority=HIGH')).pagination.total).toBe(2);
      expect((await q('priority=HIGH&status=TODO')).items.map((x: Task) => x.title)).toEqual(['Écrire le rapport']);
      expect((await q('due=withDate')).pagination.total).toBe(4);
      expect((await q('due=withoutDate')).pagination.total).toBe(21);
      expect((await q('due=overdue')).items.map((x: Task) => x.title)).toEqual(['Écrire le rapport']);
      expect((await q('due=overdue&search=email')).pagination.total).toBe(0);
    });

    it('tri : priorité sémantique, échéances nulles en fin, titre, date de création', async () => {
      const ids = async (qs: string) => (await client.get(`/tasks?limit=100&${qs}`).expect(200)).body.items as Task[];
      const byPriority = await ids('sortBy=priority&sortOrder=desc');
      expect(byPriority.slice(0, 2).every((x) => x.priority === 'HIGH')).toBe(true);
      expect(byPriority.slice(-2).every((x) => x.priority === 'LOW')).toBe(true);
      const asc = await ids('sortBy=priority&sortOrder=asc');
      expect(asc[0].priority).toBe('LOW');

      for (const order of ['asc', 'desc']) {
        const byDue = await ids(`sortBy=dueDate&sortOrder=${order}`);
        const dated = byDue.filter((x) => x.dueDate);
        expect(byDue.slice(0, 4)).toEqual(dated);
        const dates = dated.map((x) => x.dueDate!);
        expect(dates).toEqual([...dates].sort((a, b) => (order === 'asc' ? a.localeCompare(b) : b.localeCompare(a))));
      }
      const created = await ids('sortBy=createdAt&sortOrder=asc');
      expect(created[0].title).toBe('Écrire le rapport');
      expect((await client.get('/tasks?sortBy=ownerId')).status).toBe(400);
      expect((await client.get('/tasks?limit=101')).status).toBe(400);
      expect((await client.get('/tasks?limit=0')).status).toBe(400);
      expect((await client.get('/tasks?page=abc')).status).toBe(400);
      expect((await client.get('/tasks?foo=bar')).status).toBe(400);
    });

    it('T17 — trois colonnes Kanban paginées indépendamment', async () => {
      const col = async (status: string) => (await client.get(`/tasks?status=${status}&limit=5`).expect(200)).body.pagination;
      expect(await col('TODO')).toMatchObject({ total: 23, totalPages: 5, hasNextPage: true });
      expect(await col('IN_PROGRESS')).toMatchObject({ total: 1, hasNextPage: false });
      expect(await col('DONE')).toMatchObject({ total: 1, hasNextPage: false });
    });

    it('T19 — statistiques globales exactes au-delà d’une page', async () => {
      const stats = (await client.get('/tasks/stats').expect(200)).body;
      expect(stats).toEqual({
        total: 25, todo: 23, inProgress: 1, done: 1, overdue: 1, completionRate: 4,
        statusDistribution: { TODO: 23, IN_PROGRESS: 1, DONE: 1 },
      });
    });

    it('T18 — déplacement TODO → IN_PROGRESS : statut persisté, compteurs mis à jour', async () => {
      const todo = (await client.get('/tasks?status=TODO&limit=1').expect(200)).body.items[0] as Task;
      const moved = await client.patch(`/tasks/${todo.id}`, { status: 'IN_PROGRESS' });
      expect(moved.status).toBe(200);
      expect((await client.get(`/tasks/${todo.id}`)).body.status).toBe('IN_PROGRESS');
      expect((await client.get('/tasks?status=TODO')).body.pagination.total).toBe(22);
      expect((await client.get('/tasks?status=IN_PROGRESS')).body.pagination.total).toBe(2);
      const stats = (await client.get('/tasks/stats')).body;
      expect(stats.statusDistribution).toEqual({ TODO: 22, IN_PROGRESS: 2, DONE: 1 });
      expect(stats.todo + stats.inProgress + stats.done).toBe(stats.total);
    });
  });

  it('stats à zéro tâche : aucune division par zéro', async () => {
    const { client } = await registerClient(t.app);
    expect((await client.get('/tasks/stats').expect(200)).body).toEqual({
      total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0, completionRate: 0,
      statusDistribution: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
    });
  });

  it('completionRate arrondi à 0,1', async () => {
    const { client } = await registerClient(t.app);
    await create(client, { title: 'a', status: 'DONE' });
    await create(client, { title: 'b' });
    await create(client, { title: 'c' });
    expect((await client.get('/tasks/stats')).body.completionRate).toBe(33.3);
  });
});
