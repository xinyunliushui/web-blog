import http from './http';
import type { Resource, Role, User, UserStatus } from '../types/rbac';
import { API_PATHS } from '../config/api';

type UnknownRecord = Record<string, unknown>;

function unwrapPayload(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'data' in (raw as UnknownRecord)) {
    return (raw as UnknownRecord).data;
  }
  return raw;
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const o = payload as UnknownRecord;
    const inner = o.list ?? o.items ?? o.records ?? o.rows;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

function toIdStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** 后端 status：1 正常 / 2 禁用 等 */
function fromApiUserStatus(v: unknown): UserStatus {
  if (v === 'enabled' || v === true || v === 1 || v === '1') return 'enabled';
  return 'disabled';
}

function toApiUserStatus(s: UserStatus): number {
  return s === 'enabled' ? 1 : 2;
}

function normalizeUser(raw: UnknownRecord): User {
  const rolesRaw = raw.roles as unknown;
  let roleIds: string[] = [];
  if (Array.isArray(raw.roleIds)) {
    roleIds = (raw.roleIds as unknown[]).map(toIdStr);
  } else if (Array.isArray(rolesRaw)) {
    roleIds = (rolesRaw as UnknownRecord[]).map((r) => toIdStr(r?.id ?? r));
  }

  return {
    id: toIdStr(raw.id ?? raw.ID),
    username: String(raw.username ?? ''),
    password: '',
    nickname: raw.nickname != null ? String(raw.nickname) : undefined,
    status: fromApiUserStatus(raw.status),
    roleIds,
  };
}

function normalizeRole(raw: UnknownRecord): Role {
  const menusRaw = raw.menus as unknown;
  let resourceIds: string[] = [];
  if (Array.isArray(raw.resourceIds)) {
    resourceIds = (raw.resourceIds as unknown[]).map(toIdStr);
  } else if (Array.isArray(menusRaw)) {
    resourceIds = (menusRaw as UnknownRecord[]).map((m) => toIdStr(m?.id ?? m));
  }

  return {
    id: toIdStr(raw.id ?? raw.ID),
    name: String(raw.name ?? ''),
    code: String(raw.code ?? raw.keyword ?? raw.name ?? ''),
    description:
      raw.description != null
        ? String(raw.description)
        : raw.desc != null
          ? String(raw.desc)
          : undefined,
    resourceIds,
  };
}

function normalizeResource(raw: UnknownRecord): Resource {
  const typeRaw = raw.type;
  let type: Resource['type'] = 'menu';
  if (typeRaw === 'page' || typeRaw === 'button' || typeRaw === 'menu') {
    type = typeRaw;
  }

  const parent = raw.parentId ?? raw.ParentId;
  return {
    id: toIdStr(raw.id ?? raw.ID),
    name: String(raw.name ?? raw.title ?? ''),
    code: String(raw.code ?? raw.name ?? raw.path ?? ''),
    type,
    path: raw.path != null ? String(raw.path) : undefined,
    parentId:
      parent === null || parent === undefined || parent === 0 || parent === '0'
        ? null
        : toIdStr(parent),
    order:
      raw.order != null
        ? Number(raw.order)
        : raw.sort != null
          ? Number(raw.sort)
          : undefined,
    description:
      raw.description != null
        ? String(raw.description)
        : undefined,
  };
}

export type ListUsersParams = {
  page: number;
  pageSize: number;
};

/** 与 go-blog 列表接口一致：data 内 content、total、page、pageSize */
export type ListUsersResult = {
  list: User[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListRolesParams = {
  page: number;
  pageSize: number;
};

export type ListRolesResult = {
  list: Role[];
  total: number;
  page: number;
  pageSize: number;
};

/** 从分页接口 data 中取列表（优先 content）与 meta */
function parsePagedListPayload(
  payload: UnknownRecord | null | undefined,
  fallback: { page: number; pageSize: number }
): { rawItems: unknown[]; total: number; page: number; pageSize: number } {
  const p = payload ?? {};
  const c = p.content;
  let rawItems: unknown[] = [];
  if (Array.isArray(c)) {
    rawItems = c;
  } else {
    rawItems = asArray<UnknownRecord>(
      p.list ?? p.roles ?? p.items ?? p.records ?? p.rows ?? p
    );
  }
  const total = Number(p.total ?? rawItems.length);
  const page = Number(p.page ?? fallback.page);
  const pageSize = Number(p.pageSize ?? fallback.pageSize);
  return { rawItems, total, page, pageSize };
}

export const rbacApiService = {
  async listUsers(params: ListUsersParams): Promise<ListUsersResult> {
    const res = await http.get(API_PATHS.userList, {
      params: { page: params.page, pageSize: params.pageSize },
    });
    const payload = unwrapPayload(res.data) as UnknownRecord;
    const { rawItems, total, page, pageSize } = parsePagedListPayload(
      payload,
      params
    );
    const list = rawItems.map((r) =>
      normalizeUser(r as UnknownRecord)
    );
    return { list, total, page, pageSize };
  },

  async createUser(payload: Omit<User, 'id'>): Promise<User> {
    const body = {
      username: payload.username,
      password: payload.password,
      nickname: payload.nickname,
      status: toApiUserStatus(payload.status),
      roleIds: payload.roleIds,
    };
    const res = await http.post(API_PATHS.users, body);
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async updateUser(id: string, payload: Partial<Omit<User, 'id'>>): Promise<User> {
    const body: UnknownRecord = {};
    if (payload.username !== undefined) body.username = payload.username;
    if (payload.nickname !== undefined) body.nickname = payload.nickname;
    if (payload.status !== undefined) body.status = toApiUserStatus(payload.status);
    if (payload.password) body.password = payload.password;
    if (payload.roleIds !== undefined) body.roleIds = payload.roleIds;

    const res = await http.patch(`${API_PATHS.users}/${encodeURIComponent(id)}`, body);
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async deleteUser(id: string): Promise<void> {
    await http.delete(`${API_PATHS.users}/${encodeURIComponent(id)}`);
  },

  async updateUserRoles(id: string, roleIds: string[]): Promise<User> {
    const res = await http.patch(
      `${API_PATHS.users}/${encodeURIComponent(id)}/roles`,
      { roleIds },
    );
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async changeUserStatus(id: string, status: UserStatus): Promise<User> {
    return this.updateUser(id, { status });
  },

  async listRoles(params: ListRolesParams): Promise<ListRolesResult> {
    const res = await http.get(API_PATHS.roleList, {
      params: { page: params.page, pageSize: params.pageSize },
    });
    const payload = unwrapPayload(res.data) as UnknownRecord;
    const { rawItems, total, page, pageSize } = parsePagedListPayload(
      payload,
      params
    );
    const list = rawItems.map((r) =>
      normalizeRole(r as UnknownRecord)
    );
    return { list, total, page, pageSize };
  },

  async createRole(payload: Omit<Role, 'id'>): Promise<Role> {
    const body = {
      name: payload.name,
      code: payload.code,
      keyword: payload.code,
      description: payload.description,
      desc: payload.description,
      resourceIds: payload.resourceIds,
    };
    const res = await http.post(API_PATHS.roles, body);
    const data = unwrapPayload(res.data);
    return normalizeRole((data ?? {}) as UnknownRecord);
  },

  async updateRole(id: string, payload: Partial<Omit<Role, 'id'>>): Promise<Role> {
    const body: UnknownRecord = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.code !== undefined) {
      body.code = payload.code;
      body.keyword = payload.code;
    }
    if (payload.description !== undefined) {
      body.description = payload.description;
      body.desc = payload.description;
    }
    if (payload.resourceIds !== undefined) body.resourceIds = payload.resourceIds;

    const res = await http.patch(`${API_PATHS.roles}/${encodeURIComponent(id)}`, body);
    const data = unwrapPayload(res.data);
    return normalizeRole((data ?? {}) as UnknownRecord);
  },

  async deleteRole(id: string): Promise<void> {
    await http.delete(`${API_PATHS.roles}/${encodeURIComponent(id)}`);
  },

  async updateRoleResources(id: string, resourceIds: string[]): Promise<Role> {
    const res = await http.patch(
      `${API_PATHS.roles}/${encodeURIComponent(id)}/resources`,
      { resourceIds },
    );
    const data = unwrapPayload(res.data);
    return normalizeRole((data ?? {}) as UnknownRecord);
  },

  async listResources(): Promise<Resource[]> {
    const res = await http.get(API_PATHS.resources);
    const payload = unwrapPayload(res.data);
    const list = asArray<UnknownRecord>(payload).map((r) => normalizeResource(r));
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async createResource(payload: Omit<Resource, 'id'>): Promise<Resource> {
    const body = {
      ...payload,
      parentId: payload.parentId ?? null,
    };
    const res = await http.post(API_PATHS.resources, body);
    const data = unwrapPayload(res.data);
    return normalizeResource((data ?? {}) as UnknownRecord);
  },

  async updateResource(id: string, payload: Partial<Omit<Resource, 'id'>>): Promise<Resource> {
    const res = await http.patch(
      `${API_PATHS.resources}/${encodeURIComponent(id)}`,
      payload,
    );
    const data = unwrapPayload(res.data);
    return normalizeResource((data ?? {}) as UnknownRecord);
  },

  async deleteResource(id: string): Promise<void> {
    await http.delete(`${API_PATHS.resources}/${encodeURIComponent(id)}`);
  },
};
