/*
 * @Date: 2026-03-31 09:49:53
 * @Author: zhongwenhao
 * @LastEditors: zhongwenhao
 * @LastEditTime: 2026-04-24 11:30:47
 * @Description:
 */

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Tabs, Typography } from "antd";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRequestErrorMessage } from "../../utils/requestError";
import { encryptPassword } from "../../utils/rsa";

function loginErrorMessage(err: unknown): string {
  return getRequestErrorMessage(err, "登录失败");
}

type LoginFormValues = {
  username: string;
  password: string;
};

type LoginLocationState = { tab?: "blog" | "admin" };

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, login } = useAuth();
  const [activeTab, setActiveTab] = useState<"blog" | "admin">(() => {
    const state = location.state as LoginLocationState | null;
    return state?.tab === "admin" ? "admin" : "blog";
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleFinish = async (values: LoginFormValues) => {
    setLoginError(null);
    try {
      await login(values.username, encryptPassword(values.password));
      navigate("/system/users", { replace: true });
    } catch (err) {
      setLoginError(loginErrorMessage(err));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card title="个人博客系统" style={{ width: 360 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as "blog" | "admin");
            setLoginError(null);
          }}
          style={{ minHeight: 250 }}
          items={[
            {
              key: "blog",
              label: "博客浏览",
              children: (
                <div
                  style={{
                    minHeight: 250,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <Typography.Paragraph
                    type="secondary"
                    style={{
                      marginBottom: 16,
                      fontSize: 12,
                      textAlign: "left",
                    }}
                  >
                    浏览公开博客内容，如需后台管理可切换到“后台登录”
                  </Typography.Paragraph>
                  <Button
                    type="primary"
                    block
                    size="large"
                    style={{ fontWeight: 600 }}
                    onClick={() => navigate("/blogs")}
                  >
                    点击浏览博客
                  </Button>
                </div>
              ),
            },
            {
              key: "admin",
              label: "后台登录",
              children: (
                <div style={{ minHeight: 250 }}>
                  <Form<LoginFormValues> onFinish={handleFinish}>
                    <Form.Item
                      name="username"
                      rules={[{ required: true, message: "请输入用户名" }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="请输入用户名"
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "请输入密码",
                        },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="密码"
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                      >
                        登录
                      </Button>
                      {loginError ? (
                        <Alert
                          type="error"
                          message={loginError}
                          style={{ marginTop: 12 }}
                        />
                      ) : null}
                    </Form.Item>
                  </Form>
                  <Typography.Paragraph style={{ marginTop: 16, fontSize: 12 }}>
                    默认账号：
                    <br />
                    admin / admin123
                  </Typography.Paragraph>
                  <Typography.Paragraph style={{ marginTop: 8, fontSize: 12 }}>
                    还没有账号？<Link to="/register">去注册</Link>
                  </Typography.Paragraph>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default LoginPage;
