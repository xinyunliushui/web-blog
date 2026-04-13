/*
 * @Date: 2026-03-31 09:49:55
 * @Author: zhongwenhao
 * @LastEditors: zhongwenhao
 * @LastEditTime: 2026-03-31 10:07:49
 * @Description
 */
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Typography } from "antd";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type RegisterFormValues = {
  username: string;
  nickname?: string;
  mobile: string;
  avatar?: string;
  introduction?: string;
  password: string;
  confirmPassword: string;
};

export const RegisterPage = () => {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async (values: RegisterFormValues) => {
    if (values.password !== values.confirmPassword) {
      return;
    }
    try {
      await register({
        username: values.username,
        password: values.password,
        nickname: values.nickname,
        mobile: values.mobile,
        avatar: values.avatar,
        introduction: values.introduction,
      });
      navigate("/login", { replace: true });
    } catch {
      // 错误提示在 register 内部处理
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

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
      <Card title="博客管理后台 - 注册" style={{ width: 360 }}>
        <Form<RegisterFormValues> onFinish={handleFinish}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="nickname">
            <Input placeholder="昵称（可选）" />
          </Form.Item>
          <Form.Item
            name="mobile"
            rules={[
              { required: true, message: "请输入手机号" },
              {
                validator: async (_, v) => {
                  const s = v != null ? String(v).trim() : "";
                  if (!/^1\d{10}$/.test(s)) {
                    throw new Error("请输入以 1 开头的 11 位手机号");
                  }
                },
              },
            ]}
          >
            <Input placeholder="手机号（可选，11位）" maxLength={11} allowClear />
          </Form.Item>
          <Form.Item name="avatar">
            <Input placeholder="头像 URL（可选）" allowClear />
          </Form.Item>
          <Form.Item name="introduction">
            <Input.TextArea
              rows={3}
              placeholder="个人简介（可选）"
              showCount
              maxLength={255}
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "请再次输入密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph style={{ marginTop: 8, fontSize: 12 }}>
          已有账号？<Link to="/login">去登录</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

export default RegisterPage;
