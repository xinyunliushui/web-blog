import { useEffect, useMemo, useState } from "react";
import { Layout, Menu, Dropdown, Avatar, Spin } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "../context/AuthContext";
import type { AccessMenuNode } from "../types/menu";
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

  const userMenu: MenuProps["items"] = [
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
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
