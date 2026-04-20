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
import type { User } from "../types/rbac";

interface AuthContextValue {
  user: User | null;
  /** 登录 / 注册提交中 */
  loading: boolean;
  /** 是否已完成首次 GET /user/info（或失败），避免未就绪时误判未登录 */
  sessionReady: boolean;
  /** 从服务端刷新当前用户 */
  refreshUser: (options?: { throwOnError?: boolean }) => Promise<User | null>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const refreshUser = useCallback(
    async (options?: { throwOnError?: boolean }): Promise<User | null> => {
      try {
        const u = await rbacApiService.getCurrentUser();
        setUser(u);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        return u;
      } catch (err) {
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEY);
        if (options?.throwOnError) {
          throw err;
        }
        return null;
      }
    },
    []
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
        message.success("登录成功");
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
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await http.post(API_PATHS.authLogout, {}, { silent: true });
    } catch {
      /* 仍执行本地清理 */
    } finally {
      setUser(null);
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
        await rbacApiService.createUser({
          username: payload.username,
          password: payload.password,
          nickname: payload.nickname,
          mobile: payload.mobile,
          avatar: payload.avatar,
          introduction: payload.introduction,
          status: "enabled",
          roleIds: [],
        });
        message.success("注册成功，请登录");
      } catch (err) {
        message.error("注册失败");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionReady,
        refreshUser,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
