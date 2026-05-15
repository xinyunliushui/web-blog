import { User, Role, Resource, UserStatus } from '../types/rbac';

let resources: Resource[] = [
  {
    id: 'res_menu_user',
    name: '用户管理菜单',
    code: 'menu:user',
    type: 'menu',
    path: '/system/users',
    order: 1,
    description: '侧边栏中的用户管理菜单',
  },
  {
    id: 'res_page_user',
    name: '用户管理页面',
    code: 'page:user',
    type: 'page',
    path: '/system/users',
    parentId: 'res_menu_user',
    order: 1,
  },
  {
    id: 'res_btn_user_create',
    name: '新增用户按钮',
    code: 'button:user:create',
    type: 'button',
    parentId: 'res_page_user',
    order: 1,
  },
  {
    id: 'res_btn_user_edit',
    name: '编辑用户按钮',
    code: 'button:user:edit',
    type: 'button',
    parentId: 'res_page_user',
    order: 2,
  },
  {
    id: 'res_btn_user_delete',
    name: '删除用户按钮',
    code: 'button:user:delete',
    type: 'button',
    parentId: 'res_page_user',
    order: 3,
  },
  {
    id: 'res_menu_role',
    name: '角色管理菜单',
    code: 'menu:role',
    type: 'menu',
    path: '/system/roles',
    order: 2,
  },
  {
    id: 'res_page_role',
    name: '角色管理页面',
    code: 'page:role',
    type: 'page',
    path: '/system/roles',
    parentId: 'res_menu_role',
    order: 1,
  },
  {
    id: 'res_menu_resource',
    name: '资源管理菜单',
    code: 'menu:resource',
    type: 'menu',
    path: '/system/resources',
    order: 3,
  },
  {
    id: 'res_page_resource',
    name: '资源管理页面',
    code: 'page:resource',
    type: 'page',
    path: '/system/resources',
    parentId: 'res_menu_resource',
    order: 1,
  },
];

let roles: Role[] = [
  {
    id: 'role_admin',
    name: '系统管理员',
    code: 'admin',
    description: '拥有全部菜单与操作权限',
    resourceIds: resources.map((r) => r.id),
    menus: resources.map((r) => ({ id: r.id })),
  },
  {
    id: 'role_operator',
    name: '运营人员',
    code: 'operator',
    description: '只允许管理用户和角色，不能管理资源定义',
    resourceIds: resources
      .filter((r) => r.code.startsWith('menu:user') || r.code.startsWith('page:user') || r.code.startsWith('button:user'))
      .map((r) => r.id),
    menus: resources
      .filter((r) => r.code.startsWith('menu:user') || r.code.startsWith('page:user') || r.code.startsWith('button:user'))
      .map((r) => ({ id: r.id })),
  },
];

let users: User[] = [
  {
    id: 'user_1',
    username: 'admin',
    password: 'admin123',
    nickname: '超级管理员',
    status: 'enabled',
    roleIds: ['role_admin'],
  },
  {
    id: 'user_2',
    username: 'operator',
    password: 'operator123',
    nickname: '运营小二',
    status: 'enabled',
    roleIds: ['role_operator'],
  },
];

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const rbacMockService = {
  // 用户相关
  async listUsers(params: { page: number; pageSize: number }) {
    await delay();
    const { page, pageSize } = params;
    const total = users.length;
    const start = (page - 1) * pageSize;
    const list = users.slice(start, start + pageSize);
    return { list, total, page, pageSize };
  },

  async createUser(payload: Omit<User, 'id'>): Promise<User> {
    await delay();
    const newUser: User = { ...payload, id: generateId('user') };
    users = [...users, newUser];
    return newUser;
  },

  async updateUser(id: string, payload: Partial<Omit<User, 'id'>>): Promise<User> {
    await delay();
    let updated: User | undefined;
    users = users.map((u) => {
      if (u.id === id) {
        updated = { ...u, ...payload };
        return updated;
      }
      return u;
    });
    if (!updated) {
      throw new Error('用户不存在');
    }
    return updated;
  },

  async deleteUser(id: string): Promise<void> {
    await delay();
    users = users.filter((u) => u.id !== id);
  },

  async updateUserRoles(id: string, roleIds: string[]): Promise<User> {
    return this.updateUser(id, { roleIds });
  },

  async changeUserStatus(id: string, status: UserStatus): Promise<User> {
    return this.updateUser(id, { status });
  },

  async login(username: string, password: string): Promise<User> {
    await delay();
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      throw new Error('用户名或密码错误');
    }
    if (user.status !== 'enabled') {
      throw new Error('用户已被禁用');
    }
    return user;
  },

  // 角色相关
  async listRoles(params: { page: number; pageSize: number }) {
    await delay();
    const { page, pageSize } = params;
    const total = roles.length;
    const start = (page - 1) * pageSize;
    const list = roles.slice(start, start + pageSize);
    return { list, total, page, pageSize };
  },

  async createRole(payload: Omit<Role, 'id'>): Promise<Role> {
    await delay();
    const newRole: Role = {
      ...payload,
      id: generateId('role'),
      menus: payload.menus ?? [],
      resourceIds: payload.resourceIds ?? [],
    };
    roles = [...roles, newRole];
    return newRole;
  },

  async updateRole(id: string, payload: Partial<Omit<Role, 'id'>>): Promise<Role> {
    await delay();
    let updated: Role | undefined;
    roles = roles.map((r) => {
      if (r.id === id) {
        updated = { ...r, ...payload };
        return updated;
      }
      return r;
    });
    if (!updated) {
      throw new Error('角色不存在');
    }
    return updated;
  },

  async deleteRole(id: string): Promise<void> {
    await delay();
    roles = roles.filter((r) => r.id !== id);
    users = users.map((u) => ({
      ...u,
      roleIds: u.roleIds.filter((rid) => rid !== id),
    }));
  },

  async getRoleMenus(id: string): Promise<string[]> {
    await delay();
    const r = roles.find((x) => x.id === id);
    return r?.resourceIds ?? [];
  },

  async updateRoleMenus(id: string, menuIds: string[]): Promise<void> {
    await this.updateRole(id, {
      resourceIds: menuIds,
      menus: menuIds.map((mid) => ({ id: mid })),
    });
  },

  // 资源相关
  async listResources(): Promise<Resource[]> {
    await delay();
    return [...resources].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  async createResource(payload: Omit<Resource, 'id'>): Promise<Resource> {
    await delay();
    const newResource: Resource = { ...payload, id: generateId('res') };
    resources = [...resources, newResource];
    return newResource;
  },

  async updateResource(id: string, payload: Partial<Omit<Resource, 'id'>>): Promise<Resource> {
    await delay();
    let updated: Resource | undefined;
    resources = resources.map((r) => {
      if (r.id === id) {
        updated = { ...r, ...payload };
        return updated;
      }
      return r;
    });
    if (!updated) {
      throw new Error('资源不存在');
    }
    return updated;
  },

  async deleteResource(id: string): Promise<void> {
    await delay();
    const idsToDelete = new Set<string>();
    const collect = (resourceId: string) => {
      idsToDelete.add(resourceId);
      resources
        .filter((r) => r.parentId === resourceId)
        .forEach((child) => collect(child.id));
    };
    collect(id);
    resources = resources.filter((r) => !idsToDelete.has(r.id));
    roles = roles.map((role) => ({
      ...role,
      resourceIds: role.resourceIds.filter((rid) => !idsToDelete.has(rid)),
    }));
  },
};

