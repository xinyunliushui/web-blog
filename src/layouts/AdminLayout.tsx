import { Layout, Menu, Dropdown } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "../context/AuthContext";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const items: MenuItem[] = [
  {
    key: "system",
    icon: <SettingOutlined />,
    label: "系统管理",
    children: [
      {
        key: "/users",
        icon: <UserOutlined />,
        label: <Link to="/users">用户管理</Link>,
      },
      {
        key: "/roles",
        icon: <TeamOutlined />,
        label: <Link to="/roles">角色管理</Link>,
      },
      {
        key: "/resources",
        icon: <AppstoreOutlined />,
        label: <Link to="/resources">资源管理</Link>,
      },
    ],
  },
];

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
        <Menu
          theme="dark"
          mode="inline"
          defaultOpenKeys={["system"]}
          selectedKeys={[location.pathname]}
          items={items}
        />
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
            <span style={{ cursor: "pointer" }}>
              <UserOutlined style={{ marginRight: 8 }} />
              {user?.nickname || user?.username || "未登录"}
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
