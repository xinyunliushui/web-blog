import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { message } from "antd";
import { rbacMockService } from "../services/rbacMock";
import { API_PATHS } from "../config/api";
import http, { TOKEN_KEY } from "../services/http";
import type { User } from "../types/rbac";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    nickname?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "rbac_demo_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: User = JSON.parse(stored);
        setUser(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await http.post(
        API_PATHS.authLogin,
        { username, password },
        { silent: true }
      );
      const token = response.data?.token || response.data?.data?.token || "";
      const loggedIn: User = {
        id: response.data?.data?.id || username,
        username,
        password,
        nickname: response.data?.data?.nickname || username,
        status: "enabled",
        roleIds: response.data?.data?.roleIds || [],
      };
      if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
      setUser(loggedIn);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn));
      message.success("登录成功");
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post(API_PATHS.authLogout, {}, { silent: true });
    } catch {
      /* 仍执行本地清理；网络异常或 token 已失效时不阻塞退出 */
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
    }) => {
      setLoading(true);
      try {
        const newUser = await rbacMockService.createUser({
          id: "",
          username: payload.username,
          password: payload.password,
          nickname: payload.nickname,
          status: "enabled",
          roleIds: [],
        } as any);
        setUser(newUser);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        message.success("注册成功，已自动登录");
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
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
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
