/**
 * 前端 API 配置（CRA：使用 REACT_APP_* 环境变量，可在 .env / .env.local 中覆盖）
 *
 * - REACT_APP_API_BASE_URL  默认 http://localhost:8080/api（与 http://localhost:3000 同站，便于写入 Cookie）
 * - REACT_APP_API_PATH_USER_LIST / ROLE_LIST  分页列表 GET：/user/list、/role/list
 * - REACT_APP_API_PATH_USERS / ROLES / RESOURCES  各资源在 baseURL 下的路径前缀（含 CRUD）
 * - REACT_APP_API_AUTH_LOGIN / REACT_APP_API_AUTH_LOGOUT  登录、退出相对路径
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
  /** GET，query: page、pageSize */
  userList: env("REACT_APP_API_PATH_USER_LIST", "/user/list"),
  /** GET，query: page、pageSize */
  roleList: env("REACT_APP_API_PATH_ROLE_LIST", "/role/list"),
  users: env("REACT_APP_API_PATH_USERS", "/user"),
  roles: env("REACT_APP_API_PATH_ROLES", "/role"),
  resources: env("REACT_APP_API_PATH_RESOURCES", "/resources"),
  authLogin: env("REACT_APP_API_AUTH_LOGIN", "/auth/login"),
  authLogout: env("REACT_APP_API_AUTH_LOGOUT", "/auth/logout"),
} as const;
