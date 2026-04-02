import { useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { rbacApiService } from "../../services/rbacApi";
import type { User, Role, UserStatus } from "../../types/rbac";

type UserFormValues = {
  username: string;
  nickname?: string;
  status: UserStatus;
  password?: string;
};

const DEFAULT_PAGE_SIZE = 10;

export const UserPage = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [roleModalRoleIds, setRoleModalRoleIds] = useState<string[]>([]);
  const [form] = Form.useForm<UserFormValues>();

  const fetchData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const [userRes, roleRes] = await Promise.all([
        rbacApiService.listUsers({ page, pageSize }),
        // 下拉展示用：单页拉满 backend 允许的 pageSize 上限
        rbacApiService.listRoles({ page: 1, pageSize: 100 }),
      ]);
      setUsers(userRes.list);
      setRoles(roleRes.list);
      setPagination({
        current: userRes.page,
        pageSize: userRes.pageSize,
        total: userRes.total,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      message.error("加载用户数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(1, DEFAULT_PAGE_SIZE);
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserModalOpen(true);
    form.resetFields();
    form.setFieldsValue({ status: "enabled" });
  };

  const openEditModal = (record: User) => {
    setEditingUser(record);
    setUserModalOpen(true);
    form.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      status: record.status,
      password: undefined,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const { password, ...rest } = values;
        await rbacApiService.updateUser(editingUser.id, {
          ...rest,
          ...(password ? { password } : {}),
        });
        message.success("更新用户成功");
      } else {
        await rbacApiService.createUser({
          ...values,
          roleIds: [],
        } as any);
        message.success("创建用户成功");
      }
      setEditingUser(null);
      setUserModalOpen(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err instanceof Error) {
        // 表单校验错误直接返回
        return;
      }
      message.error("保存用户失败");
    }
  };

  const handleDelete = async (record: User) => {
    Modal.confirm({
      title: "确认删除该用户？",
      content: `删除后将无法恢复：${record.username}`,
      okText: "删除",
      cancelText: "取消",
      onOk: async () => {
        try {
          await rbacApiService.deleteUser(record.id);
          message.success("删除用户成功");
          await fetchData(pagination.current, pagination.pageSize);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          message.error("删除用户失败");
        }
      },
    });
  };

  const handleOpenRoleModal = (record: User) => {
    setRoleModalUser(record);
    setRoleModalRoleIds(record.roleIds);
  };

  const handleSaveUserRoles = async () => {
    if (!roleModalUser) return;
    try {
      await rbacApiService.updateUserRoles(roleModalUser.id, roleModalRoleIds);
      message.success("更新用户角色成功");
      setRoleModalUser(null);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      message.error("更新用户角色失败");
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: "用户名",
      dataIndex: "username",
    },
    {
      title: "昵称",
      dataIndex: "nickname",
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (value: UserStatus) =>
        value === "enabled" ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">禁用</Tag>
        ),
    },
    {
      title: "角色",
      dataIndex: "roleIds",
      render: (roleIds: string[]) => {
        if (!roleIds?.length)
          return <span style={{ color: "#999" }}>未分配</span>;
        return (
          <>
            {roleIds.map((rid) => {
              const role = roles.find((r) => r.id === rid);
              if (!role) return null;
              return (
                <Tag key={rid} color="blue">
                  {role.name}
                </Tag>
              );
            })}
          </>
        );
      },
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" onClick={() => handleOpenRoleModal(record)}>
            分配角色
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreateModal}>
          新增用户
        </Button>
        <Button
          onClick={() =>
            fetchData(pagination.current, pagination.pageSize)
          }
        >
          刷新
        </Button>
      </Space>
      <Table<User>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            void fetchData(page, pageSize);
          },
        }}
      />

      <Modal
        open={userModalOpen}
        title={editingUser ? "编辑用户" : "新增用户"}
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          setUserModalOpen(false);
          setEditingUser(null);
        }}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form<UserFormValues> form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="用于登录的账号名" />
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input placeholder="显示使用的昵称" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={
              editingUser ? [] : [{ required: true, message: "请输入密码" }]
            }
          >
            <Input.Password
              placeholder={editingUser ? "留空则不修改密码" : "登录密码"}
            />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="enabled">启用</Select.Option>
              <Select.Option value="disabled">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={roleModalUser !== null}
        title={
          roleModalUser
            ? `为用户 ${roleModalUser.username} 分配角色`
            : "分配角色"
        }
        okText="确定"
        cancelText="取消"
        onCancel={() => setRoleModalUser(null)}
        onOk={handleSaveUserRoles}
        destroyOnClose
      >
        <Select<string[]>
          mode="multiple"
          style={{ width: "100%" }}
          placeholder="请选择角色"
          value={roleModalRoleIds}
          onChange={setRoleModalRoleIds}
        >
          {roles.map((role) => (
            <Select.Option key={role.id} value={role.id}>
              {role.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </>
  );
};

export default UserPage;
