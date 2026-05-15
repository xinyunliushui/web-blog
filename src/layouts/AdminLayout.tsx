import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Spin,
  Form,
  Input,
  Modal,
  Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "../context/AuthContext";
import type { AccessMenuNode } from "../types/menu";
import { API_PATHS } from "../config/api";
import http from "../services/http";
import { encryptPassword } from "../utils/rsa";
import {
  accessMenuNodesToAntdItems,
  openKeysForSelectedPath,
} from "./adminMenuFromTree";

const { Header, Sider, Content } = Layout;

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, accessMenuTree, accessMenuLoading } = useAuth();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdSubmitting, setChangePwdSubmitting] = useState(false);
  const [logoutRedirectSeconds, setLogoutRedirectSeconds] = useState(0);
  const [changePwdForm] = Form.useForm<{
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();
  const menuTree: AccessMenuNode[] = accessMenuTree;

  const menuItems = useMemo(
    () =>
      accessMenuNodesToAntdItems(menuTree, "", (to, title) => (
        <Link to={to}>{title}</Link>
      )),
    [menuTree]
  );

  useEffect(() => {
    if (!menuItems.length) return;
    const required = openKeysForSelectedPath(menuItems, location.pathname);
    setOpenKeys((prev) => Array.from(new Set([...prev, ...required])));
  }, [location.pathname, menuItems]);

  const redirectToLoginAfterLogout = useCallback(async () => {
    setLogoutRedirectSeconds(0);
    await logout();
    navigate("/login", { replace: true, state: { tab: "admin" } });
  }, [logout, navigate]);

  useEffect(() => {
    if (logoutRedirectSeconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (logoutRedirectSeconds <= 1) {
        void redirectToLoginAfterLogout();
        return;
      }
      setLogoutRedirectSeconds((prev) => prev - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [logoutRedirectSeconds, redirectToLoginAfterLogout]);

  const openChangePwdModal = () => {
    changePwdForm.resetFields();
    setChangePwdOpen(true);
  };

  const closeChangePwdModal = () => {
    if (changePwdSubmitting) return;
    setChangePwdOpen(false);
    changePwdForm.resetFields();
  };

  const submitChangePwd = async () => {
    try {
      const values = await changePwdForm.validateFields();
      setChangePwdSubmitting(true);
      await http.post(API_PATHS.userChangePwd, {
        oldPassword: encryptPassword(values.oldPassword),
        newPassword: encryptPassword(values.newPassword),
      });
      setChangePwdOpen(false);
      changePwdForm.resetFields();
      setLogoutRedirectSeconds(3);
    } finally {
      setChangePwdSubmitting(false);
    }
  };

  const userMenu: MenuProps["items"] = [
    {
      key: "changePwd",
      label: "修改密码",
      onClick: openChangePwdModal,
    },
    {
      key: "logout",
      label: "退出登录",
      onClick: async () => {
        await logout();
        navigate("/login", { replace: true });
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            height: 48,
            margin: 16,
            color: "#fff",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
          }}
        >
          博客管理系统
        </div>
        {accessMenuLoading ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <Menu
            theme="dark"
            mode="inline"
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            selectedKeys={[location.pathname]}
            items={menuItems}
          />
        )}
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500 }}></span>
          <Dropdown menu={{ items: userMenu }} trigger={["click"]}>
            <span
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Avatar size="small" src={user?.avatar} icon={<UserOutlined />} />
              <span>{user?.nickname || user?.username || "未登录"}</span>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              padding: 24,
              background: "#fff",
              borderRadius: 8,
              minHeight: 360,
              maxWidth: "100%",
              overflowX: "auto",
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
      <Modal
        title="修改密码"
        open={changePwdOpen}
        onCancel={closeChangePwdModal}
        onOk={submitChangePwd}
        okText="确认修改"
        cancelText="取消"
        confirmLoading={changePwdSubmitting}
        maskClosable={false}
      >
        <Form form={changePwdForm} layout="vertical">
          <Form.Item
            label="原密码"
            name="oldPassword"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 6, message: "新密码至少 6 位" },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请再次输入新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue("newPassword")) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的新密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="密码修改成功"
        open={logoutRedirectSeconds > 0}
        maskClosable={false}
        closable={false}
        cancelButtonProps={{ style: { display: "none" } }}
        okText="立即退出登录"
        onOk={() => void redirectToLoginAfterLogout()}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {logoutRedirectSeconds} 秒后自动退出登录并跳转到登录页
        </Typography.Paragraph>
      </Modal>
    </Layout>
  );
};

export default AdminLayout;
