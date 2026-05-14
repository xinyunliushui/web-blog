import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { message } from "antd";
import { API_PATHS } from "../config/api";
import http, { TOKEN_KEY } from "../services/http";
import { rbacApiService } from "../services/rbacApi";
import type { AccessMenuNode } from "../types/menu";
import type { User } from "../types/rbac";

interface AuthContextValue {
  user: User | null;
  /** 登录 / 注册提交中 */
  loading: boolean;
  /** 是否已完成首次 GET /user/info（或失败），避免未就绪时误判未登录 */
  sessionReady: boolean;
  /** 从服务端刷新当前用户 */
  refreshUser: (options?: { throwOnError?: boolean }) => Promise<User | null>;
  accessMenuTree: AccessMenuNode[];
  accessMenuLoading: boolean;
  accessMenuPaths: string[];
  refreshAccessMenus: (userId?: string) => Promise<AccessMenuNode[]>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    nickname?: string;
    mobile: string;
    avatar?: string;
    introduction?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "rbac_demo_user";

const getBackendErrorMessage = (err: unknown): string => {
  if (!err || typeof err !== "object") return "";
  const e = err as {
    response?: {
      data?: {
        message?: unknown;
        msg?: unknown;
      };
    };
    message?: unknown;
  };
  const backendMessage =
    e.response?.data?.message ?? e.response?.data?.msg ?? e.message;
  return typeof backendMessage === "string" ? backendMessage : "";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [accessMenuTree, setAccessMenuTree] = useState<AccessMenuNode[]>([]);
  const [accessMenuLoading, setAccessMenuLoading] = useState(false);

  const collectLeafPaths = useCallback((tree: AccessMenuNode[]): string[] => {
    const join = (parent: string, segment: string): string => {
      const s = (segment || "").trim();
      if (!s) return parent || "/";
      if (s.startsWith("/"))
        return "/" + s.replace(/^\/+/g, "").replace(/\/+$/g, "");
      const p = (parent || "").replace(/\/+$/g, "");
      const n = s.replace(/^\/+/g, "").replace(/\/+$/g, "");
      return (p ? `${p}/${n}` : `/${n}`).replace(/\/+/g, "/");
    };
    const paths: string[] = [];
    const walk = (nodes: AccessMenuNode[], parent: string) => {
      for (const node of nodes || []) {
        if (node.status !== 1 || node.hidden === 1) continue;
        const fullPath = join(parent, node.path);
        const children = (node.children || []).filter(
          (child) => child.status === 1 && child.hidden !== 1
        );
        if (children.length > 0) {
          walk(children, fullPath);
          continue;
        }
        const redirect = (node.redirect || "").trim();
        if (redirect) {
          paths.push(join(redirect.startsWith("/") ? "" : parent, redirect));
        } else {
          paths.push(fullPath);
        }
      }
    };
    walk(tree, "");
    return Array.from(new Set(paths.filter(Boolean)));
  }, []);

  const refreshAccessMenus = useCallback(async (userId?: string) => {
    const uid = (userId || "").trim();
    if (!uid) {
      setAccessMenuTree([]);
      return [];
    }
    setAccessMenuLoading(true);
    try {
      const tree = await rbacApiService.getMenuAccessTree(uid);
      setAccessMenuTree(tree);
      return tree;
    } catch (err) {
      setAccessMenuTree([]);
      throw err;
    } finally {
      setAccessMenuLoading(false);
    }
  }, []);

  const refreshUser = useCallback(
    async (options?: { throwOnError?: boolean }): Promise<User | null> => {
      try {
        const u = await rbacApiService.getCurrentUser();
        setUser(u);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        await refreshAccessMenus(String(u.id ?? ""));
        return u;
      } catch (err) {
        setUser(null);
        setAccessMenuTree([]);
        window.localStorage.removeItem(STORAGE_KEY);
        if (options?.throwOnError) {
          throw err;
        }
        return null;
      }
    },
    [refreshAccessMenus]
  );

  // 应用启动：用 Cookie 中的 JWT 拉取 /user/info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) {
          await refreshUser();
        }
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      setLoading(true);
      try {
        await http.post(
          API_PATHS.authLogin,
          { username, password },
          { silent: true }
        );
        const u = await refreshUser({ throwOnError: true });
        if (!u) {
          throw new Error("登录成功，但获取用户信息失败，请稍后重试");
        }
        messageApi.success("登录成功");
      } catch (err) {
        if (err instanceof Error) {
          const backendMessage = getBackendErrorMessage(err);
          err.message = backendMessage || err.message || "登录失败，请稍后重试";
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [messageApi, refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await http.post(API_PATHS.authLogout, {}, { silent: true });
    } catch {
      /* 仍执行本地清理 */
    } finally {
      setUser(null);
      setAccessMenuTree([]);
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const register = useCallback(
    async (payload: {
      username: string;
      password: string;
      nickname?: string;
      mobile: string;
      avatar?: string;
      introduction?: string;
    }) => {
      setLoading(true);
      try {
        await rbacApiService.registerUser({
          username: payload.username,
          password: payload.password,
          nickname: payload.nickname,
          mobile: payload.mobile,
          avatar: payload.avatar,
          introduction: payload.introduction,
          status: "enabled",
          roleIds: [],
        });
        messageApi.success("注册成功，请登录");
      } catch (err) {
        message.error("注册失败");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [messageApi]
  );

  return (
    <>
      {contextHolder}
      <AuthContext.Provider
        value={{
          user,
          loading,
          sessionReady,
          refreshUser,
          accessMenuTree,
          accessMenuLoading,
          accessMenuPaths: collectLeafPaths(accessMenuTree),
          refreshAccessMenus,
          login,
          logout,
          register,
        }}
      >
        {children}
      </AuthContext.Provider>
    </>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
