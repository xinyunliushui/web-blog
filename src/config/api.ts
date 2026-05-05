/**
 * 前端 API 配置（CRA：使用 REACT_APP_* 环境变量，可在 .env / .env.local 中覆盖）
 *
 * - REACT_APP_API_BASE_URL  默认 http://localhost:8080/api（与 http://localhost:3000 同站，便于写入 Cookie）
 * - REACT_APP_API_PATH_USER_INFO  当前用户 GET：/user/info
 * - REACT_APP_API_PATH_USER_LIST / ROLE_LIST  分页列表 GET：/user/list、/role/list
 * - REACT_APP_API_PATH_USERS / ROLES / RESOURCES  各资源在 baseURL 下的路径前缀（含 CRUD）
 * - REACT_APP_API_AUTH_LOGIN / REACT_APP_API_AUTH_LOGOUT  登录、退出相对路径
 * - REACT_APP_API_PATH_MENU_ACCESS_TREE  用户菜单树 GET 前缀，实际请求为 {prefix}/:userId
 */

const env = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v != null && String(v).trim() !== "" ? String(v).trim() : fallback;
};

/** API 根地址（含 /api 前缀，不含末尾 /） */
export const API_BASE_URL = env(
  "REACT_APP_API_BASE_URL",
  "http://localhost:8080/api"
);

/** 系统管理各模块在 API_BASE_URL 下的路径（以 / 开头） */
export const API_PATHS = {
  /** GET，当前登录用户（Cookie/Authorization 携带 JWT） */
  userInfo: env("REACT_APP_API_PATH_USER_INFO", "/user/info"),
  /** GET，query: page、pageSize */
  userList: env("REACT_APP_API_PATH_USER_LIST", "/user/list"),
  /** POST，创建用户 */
  userCreate: env("REACT_APP_API_PATH_USER_CREATE", "/user/create"),
  /** POST，更新用户 */
  userUpdate: env("REACT_APP_API_PATH_USER_UPDATE", "/user/update"),
  /** POST，当前登录用户修改密码 */
  userChangePwd: env("REACT_APP_API_PATH_USER_CHANGE_PWD", "/user/changePwd"),
  /** GET，query: page、pageSize */
  roleList: env("REACT_APP_API_PATH_ROLE_LIST", "/role/list"),
  /** POST，创建角色 */
  roleCreate: env("REACT_APP_API_PATH_ROLE_CREATE", "/role/create"),
  users: env("REACT_APP_API_PATH_USERS", "/user"),
  roles: env("REACT_APP_API_PATH_ROLES", "/role"),
  resources: env("REACT_APP_API_PATH_RESOURCES", "/resources"),
  authLogin: env("REACT_APP_API_AUTH_LOGIN", "/auth/login"),
  authLogout: env("REACT_APP_API_AUTH_LOGOUT", "/auth/logout"),
  /** GET /menu/list，菜单平铺列表 */
  menuList: env("REACT_APP_API_PATH_MENU_LIST", "/menu/list"),
  /** GET /menu/tree，菜单树 */
  menuTree: env("REACT_APP_API_PATH_MENU_TREE", "/menu/tree"),
  /** POST /menu/create，创建菜单 */
  menuCreate: env("REACT_APP_API_PATH_MENU_CREATE", "/menu/create"),
  /** POST /menu/update/:menuId，更新菜单 */
  menuUpdate: env("REACT_APP_API_PATH_MENU_UPDATE", "/menu/update"),
  /** GET /menu/access/tree/:userId，用户可访问菜单树 */
  menuAccessTree: env(
    "REACT_APP_API_PATH_MENU_ACCESS_TREE",
    "/menu/access/tree"
  ),
  /** GET /blog/list，文章列表 */
  blogList: env("REACT_APP_API_PATH_BLOG_LIST", "/blog/list"),
  /** GET /blog/search，全文搜索 query: keyword、page、pageSize */
  blogSearch: env("REACT_APP_API_PATH_BLOG_SEARCH", "/blog/search"),
  /** POST /blog/create，新增文章 */
  blogCreate: env("REACT_APP_API_PATH_BLOG_CREATE", "/blog/create"),
  /** POST /blog/update/:blogId，编辑文章 */
  blogUpdate: env("REACT_APP_API_PATH_BLOG_UPDATE", "/blog/update"),
  /** GET /blog/detail/:blogId，文章详情 */
  blogDetail: env("REACT_APP_API_PATH_BLOG_DETAIL", "/blog/detail"),
  /** POST /blog/publish/:blogId，发布/下线 */
  blogUpdatePublish: env(
    "REACT_APP_API_PATH_BLOG_UPDATE_PUBLISH",
    "/blog/publish"
  ),
} as const;
