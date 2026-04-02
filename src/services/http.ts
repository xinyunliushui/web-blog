import axios, { AxiosError } from "axios";
import { message, Modal } from "antd";
import { API_BASE_URL } from "../config/api";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** 为 true 时不弹出全局 message，由调用方自行展示错误 */
    silent?: boolean;
  }
}

export const TOKEN_KEY = "rbac_demo_token";

/** 与 AuthContext 中用户缓存键一致，401 时需一并清除 */
const AUTH_USER_STORAGE_KEY = "rbac_demo_user";

const isUnauthorizedCode = (code: unknown): boolean =>
  code === 401 || code === "401";

const isForbiddenCode = (code: unknown): boolean =>
  code === 403 || code === "403";

const redirectToLogin = () => {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const showForbiddenModal = () => {
  Modal.warning({
    title: "无权限",
    content: "访问无权限，请联系管理员设置",
  });
};

const getCookieValue = (name: string): string => {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`
    )
  );
  return match ? decodeURIComponent(match[1]) : "";
};

const http = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ""),
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.request.use((config) => {
  const token = getCookieValue("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const silent = response.config?.silent === true;
    const code = (response.data as { code?: unknown })?.code;

    if (isUnauthorizedCode(code)) {
      if (!silent) {
        message.error("登录已过期，请重新登录");
      }
      redirectToLogin();
      return Promise.reject(new Error("Unauthorized"));
    }
    if (isForbiddenCode(code)) {
      if (!silent) {
        showForbiddenModal();
      }
      return Promise.reject(new Error("Forbidden"));
    }

    return response;
  },
  (error: AxiosError<any>) => {
    const silent = error.config?.silent === true;
    const data = error.response?.data as any;
    const bodyCode = data?.code;
    const backendMessage = data?.message || data?.msg || "";

    if (isUnauthorizedCode(bodyCode) || error.response?.status === 401) {
      if (!silent) {
        message.error(backendMessage || "登录已过期，请重新登录");
      }
      redirectToLogin();
      return Promise.reject(error);
    }

    if (isForbiddenCode(bodyCode) || error.response?.status === 403) {
      if (!silent) {
        showForbiddenModal();
      }
      return Promise.reject(error);
    }

    if (!silent && backendMessage) {
      message.error(backendMessage);
    }

    return Promise.reject(error);
  }
);

export default http;
