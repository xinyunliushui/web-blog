/*
 * @Date: 2026-03-31 09:49:53
 * @Author: zhongwenhao
 * @LastEditors: zhongwenhao
 * @LastEditTime: 2026-04-01 09:58:12
 * @Description:
 */

import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loading, login } = useAuth();
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
      <Card title="博客管理后台 - 登录" style={{ width: 360 }}>
        <Form<LoginFormValues> onFinish={handleFinish}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
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
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
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
      </Card>
    </div>
  );
};

export default LoginPage;
