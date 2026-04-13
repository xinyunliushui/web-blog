import http from "./http";
import type { AccessMenuNode } from "../types/menu";
import type { Resource, Role, User, UserStatus } from "../types/rbac";
import { API_PATHS } from "../config/api";

type UnknownRecord = Record<string, unknown>;

function unwrapPayload(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "data" in (raw as UnknownRecord)) {
    return (raw as UnknownRecord).data;
  }
  return raw;
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const o = payload as UnknownRecord;
    const inner = o.list ?? o.items ?? o.records ?? o.rows;
    if (Array.isArray(inner)) return inner as T[];
  }
  return [];
}

function toIdStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** 后端 status：1 正常 / 2 禁用 等 */
function fromApiUserStatus(v: unknown): UserStatus {
  if (v === "enabled" || v === true || v === 1 || v === "1") return "enabled";
  return "disabled";
}

function toApiUserStatus(s: UserStatus): number {
  return s === "enabled" ? 1 : 2;
}

function normalizeUser(raw: UnknownRecord): User {
  const rolesRaw = raw.roles as unknown;
  let roleIds: string[] = [];
  if (Array.isArray(raw.roleIds)) {
    roleIds = (raw.roleIds as unknown[]).map(toIdStr);
  } else if (Array.isArray(rolesRaw)) {
    roleIds = (rolesRaw as UnknownRecord[]).map((r) => toIdStr(r?.id ?? r));
  }

  const avatar =
    raw.avatar != null && String(raw.avatar).trim() !== ""
      ? String(raw.avatar)
      : undefined;
  const mobile =
    raw.mobile != null && String(raw.mobile).trim() !== ""
      ? String(raw.mobile)
      : undefined;
  const introduction =
    raw.introduction != null && String(raw.introduction).trim() !== ""
      ? String(raw.introduction)
      : undefined;
  return {
    id: toIdStr(raw.id ?? raw.ID),
    username: String(raw.username ?? ""),
    password: "",
    nickname: raw.nickname != null ? String(raw.nickname) : undefined,
    mobile,
    avatar,
    introduction,
    status: fromApiUserStatus(raw.status),
    roleIds,
  };
}

/**
 * GET /user/info：后端 data 即为 UserInfoDto（id、username、mobile、avatar、nickname、introduction、roleIds）
 * 兼容旧版 data.userInfo 或 roles[] 嵌套。
 */
function normalizeUserInfoPayload(raw: UnknownRecord): User {
  let roleIds: string[] = [];
  if (Array.isArray(raw.roleIds)) {
    roleIds = (raw.roleIds as unknown[]).map(toIdStr);
  } else {
    const rolesRaw = raw.roles as unknown;
    if (Array.isArray(rolesRaw)) {
      roleIds = (rolesRaw as UnknownRecord[]).map((r) =>
        toIdStr(r?.id ?? r?.ID)
      );
    }
  }
  const status: UserStatus =
    raw.status !== undefined && raw.status !== null
      ? fromApiUserStatus(raw.status)
      : "enabled";
  const avatar =
    raw.avatar != null && String(raw.avatar).trim() !== ""
      ? String(raw.avatar)
      : undefined;
  const mobile =
    raw.mobile != null && String(raw.mobile).trim() !== ""
      ? String(raw.mobile)
      : undefined;
  const introduction =
    raw.introduction != null && String(raw.introduction).trim() !== ""
      ? String(raw.introduction)
      : undefined;
  return {
    id: toIdStr(raw.id ?? raw.ID),
    username: String(raw.username ?? ""),
    password: "",
    nickname: raw.nickname != null ? String(raw.nickname) : undefined,
    mobile,
    avatar,
    introduction,
    status,
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
    name: String(raw.name ?? ""),
    code: String(raw.code ?? raw.keyword ?? raw.name ?? ""),
    description:
      raw.description != null
        ? String(raw.description)
        : raw.desc != null
        ? String(raw.desc)
        : undefined,
    resourceIds,
  };
}

function normalizeAccessMenuNode(raw: UnknownRecord): AccessMenuNode {
  const childrenRaw = raw.children;
  let children: AccessMenuNode[] | undefined;
  if (Array.isArray(childrenRaw) && childrenRaw.length > 0) {
    children = (childrenRaw as UnknownRecord[]).map((c) =>
      normalizeAccessMenuNode(c)
    );
  }
  return {
    id: Number(raw.id ?? raw.ID ?? 0),
    name: String(raw.name ?? ""),
    title: String(raw.title ?? raw.name ?? ""),
    icon:
      raw.icon != null && String(raw.icon).trim() !== ""
        ? String(raw.icon)
        : null,
    path: String(raw.path ?? ""),
    redirect:
      raw.redirect != null && String(raw.redirect).trim() !== ""
        ? String(raw.redirect)
        : null,
    sort: raw.sort != null ? Number(raw.sort) : 999,
    status: raw.status != null ? Number(raw.status) : 1,
    hidden: raw.hidden != null ? Number(raw.hidden) : 2,
    children,
  };
}

function normalizeAccessMenuTree(payload: unknown): AccessMenuNode[] {
  const inner = unwrapPayload(payload);
  if (!Array.isArray(inner)) return [];
  return (inner as UnknownRecord[]).map((n) => normalizeAccessMenuNode(n));
}

function normalizeResource(raw: UnknownRecord): Resource {
  const typeRaw = raw.type;
  let type: Resource["type"] = "menu";
  if (typeRaw === "page" || typeRaw === "button" || typeRaw === "menu") {
    type = typeRaw;
  }

  const parent = raw.parentId ?? raw.ParentId;
  return {
    id: toIdStr(raw.id ?? raw.ID),
    name: String(raw.name ?? raw.title ?? ""),
    code: String(raw.code ?? raw.name ?? raw.path ?? ""),
    type,
    path: raw.path != null ? String(raw.path) : undefined,
    parentId:
      parent === null || parent === undefined || parent === 0 || parent === "0"
        ? null
        : toIdStr(parent),
    order:
      raw.order != null
        ? Number(raw.order)
        : raw.sort != null
        ? Number(raw.sort)
        : undefined,
    description: raw.description != null ? String(raw.description) : undefined,
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

/**
 * 相同 GET 在并发/重复调用时合并为一次真实请求（例如 React StrictMode 下 effect 会跑两轮）。
 * 请求结束后再发起才会走新请求。
 */
const inflightGets = new Map<string, Promise<unknown>>();

function runDedupedGet<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflightGets.get(key);
  if (existing) return existing as Promise<T>;
  const p = run().finally(() => {
    inflightGets.delete(key);
  });
  inflightGets.set(key, p);
  return p;
}

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
  /** 当前登录用户：GET /user/info */
  async getCurrentUser(): Promise<User> {
    const key = `getCurrentUser:${API_PATHS.userInfo}`;
    return runDedupedGet(key, async () => {
      const res = await http.get(API_PATHS.userInfo, { silent: true });
      const payload = unwrapPayload(res.data) as UnknownRecord;
      const info =
        (payload?.userInfo as UnknownRecord | undefined) ??
        (payload?.user as UnknownRecord | undefined) ??
        payload;
      return normalizeUserInfoPayload((info ?? {}) as UnknownRecord);
    });
  },

  /**
   * GET /menu/access/tree/:userId
   * 字段与后端 model.Menu 一致：name、title、icon、path、redirect、sort、status、hidden、children
   */
  async getMenuAccessTree(userId: string): Promise<AccessMenuNode[]> {
    const id = String(userId ?? "").trim();
    if (!id) return [];
    const url = `${API_PATHS.menuAccessTree}/${encodeURIComponent(id)}`;
    const key = `menuAccessTree:${url}`;
    return runDedupedGet(key, async () => {
      const res = await http.get(url);
      return normalizeAccessMenuTree(res.data);
    });
  },

  async listUsers(params: ListUsersParams): Promise<ListUsersResult> {
    const key = `listUsers:${API_PATHS.userList}:${params.page}:${params.pageSize}`;
    return runDedupedGet(key, async () => {
      const res = await http.get(API_PATHS.userList, {
        params: { page: params.page, pageSize: params.pageSize },
      });
      const payload = unwrapPayload(res.data) as UnknownRecord;
      const { rawItems, total, page, pageSize } = parsePagedListPayload(
        payload,
        params
      );
      const list = rawItems.map((r) => normalizeUser(r as UnknownRecord));
      return { list, total, page, pageSize };
    });
  },

  async createUser(payload: Omit<User, "id">): Promise<User> {
    const body: UnknownRecord = {
      username: payload.username,
      password: payload.password,
      nickname: payload.nickname,
    };
    if (payload.mobile !== undefined) body.mobile = payload.mobile;
    if (payload.avatar !== undefined) body.avatar = payload.avatar;
    if (payload.introduction !== undefined)
      body.introduction = payload.introduction;
    const res = await http.post(API_PATHS.userCreate, body);
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async updateUser(
    id: string,
    payload: Partial<Omit<User, "id">>
  ): Promise<User> {
    const body: UnknownRecord = {};
    if (payload.username !== undefined) body.username = payload.username;
    if (payload.nickname !== undefined) body.nickname = payload.nickname;
    if (payload.mobile !== undefined) body.mobile = payload.mobile;
    if (payload.avatar !== undefined) body.avatar = payload.avatar;
    if (payload.introduction !== undefined)
      body.introduction = payload.introduction;
    if (payload.status !== undefined)
      body.status = toApiUserStatus(payload.status);
    if (payload.password) body.password = payload.password;
    if (payload.roleIds !== undefined) body.roleIds = payload.roleIds;

    const res = await http.patch(
      `${API_PATHS.users}/${encodeURIComponent(id)}`,
      body
    );
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async deleteUser(id: string): Promise<void> {
    await http.delete(`${API_PATHS.users}/${encodeURIComponent(id)}`);
  },

  async updateUserRoles(id: string, roleIds: string[]): Promise<User> {
    const res = await http.patch(
      `${API_PATHS.users}/${encodeURIComponent(id)}/roles`,
      { roleIds }
    );
    const data = unwrapPayload(res.data);
    return normalizeUser((data ?? {}) as UnknownRecord);
  },

  async changeUserStatus(id: string, status: UserStatus): Promise<User> {
    return this.updateUser(id, { status });
  },

  async listRoles(params: ListRolesParams): Promise<ListRolesResult> {
    const key = `listRoles:${API_PATHS.roleList}:${params.page}:${params.pageSize}`;
    return runDedupedGet(key, async () => {
      const res = await http.get(API_PATHS.roleList, {
        params: { page: params.page, pageSize: params.pageSize },
      });
      const payload = unwrapPayload(res.data) as UnknownRecord;
      const { rawItems, total, page, pageSize } = parsePagedListPayload(
        payload,
        params
      );
      const list = rawItems.map((r) => normalizeRole(r as UnknownRecord));
      return { list, total, page, pageSize };
    });
  },

  async createRole(payload: Omit<Role, "id">): Promise<Role> {
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

  async updateRole(
    id: string,
    payload: Partial<Omit<Role, "id">>
  ): Promise<Role> {
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
    if (payload.resourceIds !== undefined)
      body.resourceIds = payload.resourceIds;

    const res = await http.patch(
      `${API_PATHS.roles}/${encodeURIComponent(id)}`,
      body
    );
    const data = unwrapPayload(res.data);
    return normalizeRole((data ?? {}) as UnknownRecord);
  },

  async deleteRole(id: string): Promise<void> {
    await http.delete(`${API_PATHS.roles}/${encodeURIComponent(id)}`);
  },

  async updateRoleResources(id: string, resourceIds: string[]): Promise<Role> {
    const res = await http.patch(
      `${API_PATHS.roles}/${encodeURIComponent(id)}/resources`,
      { resourceIds }
    );
    const data = unwrapPayload(res.data);
    return normalizeRole((data ?? {}) as UnknownRecord);
  },

  async listResources(): Promise<Resource[]> {
    const res = await http.get(API_PATHS.resources);
    const payload = unwrapPayload(res.data);
    const list = asArray<UnknownRecord>(payload).map((r) =>
      normalizeResource(r)
    );
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async createResource(payload: Omit<Resource, "id">): Promise<Resource> {
    const body = {
      ...payload,
      parentId: payload.parentId ?? null,
    };
    const res = await http.post(API_PATHS.resources, body);
    const data = unwrapPayload(res.data);
    return normalizeResource((data ?? {}) as UnknownRecord);
  },

  async updateResource(
    id: string,
    payload: Partial<Omit<Resource, "id">>
  ): Promise<Resource> {
    const res = await http.patch(
      `${API_PATHS.resources}/${encodeURIComponent(id)}`,
      payload
    );
    const data = unwrapPayload(res.data);
    return normalizeResource((data ?? {}) as UnknownRecord);
  },

  async deleteResource(id: string): Promise<void> {
    await http.delete(`${API_PATHS.resources}/${encodeURIComponent(id)}`);
  },
};
