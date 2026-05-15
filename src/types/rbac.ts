export type ResourceType = 'menu' | 'page' | 'button';

export interface Resource {
  id: string;
  /** 资源名称，例如“用户管理”、“新增按钮” */
  name: string;
  /** 资源编码，建议全局唯一，例如 user:list、user:create、user:page */
  code: string;
  /** 资源类型：菜单 / 页面 / 页面下的按钮 */
  type: ResourceType;
  /** 路由路径，仅对菜单或页面类型资源有意义，例如 /system/users */
  path?: string;
  /** 父级资源 ID，用于形成层级关系（菜单 -> 页面 -> 按钮） */
  parentId?: string | null;
  /** 排序号，越小越靠前 */
  order?: number;
  /** 资源描述信息 */
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  /** 角色编码，建议与后端保持一致，例如 admin、editor */
  code: string;
  /** 角色状态：1 启用，2 禁用 */
  status?: number;
  /** 角色排序 */
  sort?: number;
  description?: string;
  /** 拥有的资源 ID 列表 */
  resourceIds: string[];
  /**
   * 列表接口行数据中的已绑定菜单（与 go-blog `menus` 一致）；
   * 未返回该字段时由前端置为 undefined，仅依据此字段展示是否已绑定菜单。
   */
  menus?: { id: string }[];
}

export type UserStatus = 'enabled' | 'disabled';

export interface User {
  id: string;
  /** 登录账号 */
  username: string;
  /** 登录密码，仅用于前端 mock / 新增用户 */
  password: string;
  /** 显示昵称 */
  nickname?: string;
  /** 手机号 */
  mobile?: string;
  /** 头像 URL */
  avatar?: string;
  /** 个人简介 */
  introduction?: string;
  status: UserStatus;
  /** 拥有的角色 ID 列表 */
  roleIds: string[];
}

