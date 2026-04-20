import { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  Image as AntdImage,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "../../context/AuthContext";
import { rbacApiService } from "../../services/rbacApi";
import type { User, Role, UserStatus } from "../../types/rbac";
import {
  getRequestErrorMessage,
  isFormValidationError,
} from "../../utils/requestError";

type UserFormValues = {
  username: string;
  nickname?: string;
  mobile?: string;
  avatar?: string;
  introduction?: string;
  status: UserStatus;
  password?: string;
};

const DEFAULT_PAGE_SIZE = 10;

export const UserPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const { user: currentUser } = useAuth();
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
  const [usernameEditConfirmed, setUsernameEditConfirmed] = useState(false);
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
      messageApi.error(getRequestErrorMessage(err, "加载用户数据失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, DEFAULT_PAGE_SIZE);
  }, []);

  const openEditModal = (record: User) => {
    setEditingUser(record);
    setUserModalOpen(true);
    setUsernameEditConfirmed(false);
    form.setFieldsValue({
      username: record.username,
      nickname: record.nickname,
      mobile: record.mobile,
      avatar: record.avatar,
      introduction: record.introduction,
      status: record.status,
    });
  };

  const isCurrentUser = (record: User) =>
    String(record.id) === String(currentUser?.id ?? "");

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!editingUser) {
        return;
      }
      await rbacApiService.updateUser(editingUser.id, {
        username: values.username,
        nickname: values.nickname,
        mobile: values.mobile,
        avatar: values.avatar,
        introduction: values.introduction,
        status: values.status,
        roleIds: (editingUser.roleIds ?? []).map((id) => String(id)),
      });
      messageApi.success("用户编辑成功");
      setEditingUser(null);
      setUserModalOpen(false);
      setUsernameEditConfirmed(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      if (isFormValidationError(err)) {
        return;
      }
      messageApi.error(getRequestErrorMessage(err, "保存用户失败"));
    }
  };

  const handleOpenRoleModal = (record: User) => {
    setRoleModalUser(record);
    setRoleModalRoleIds((record.roleIds ?? []).map((id) => String(id)));
  };

  const handleSaveUserRoles = async () => {
    if (!roleModalUser) return;
    if (!roleModalRoleIds.length) {
      messageApi.warning("请至少选择一个角色");
      return;
    }
    try {
      await rbacApiService.updateUserRoles(
        roleModalUser.id,
        roleModalRoleIds,
        roleModalUser
      );
      setRoleModalUser(null);
      setRoleModalRoleIds([]);
      await fetchData(pagination.current, pagination.pageSize);
      messageApi.success("用户分配角色成功");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      messageApi.error(getRequestErrorMessage(err, "更新用户角色失败"));
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
      title: "手机号",
      dataIndex: "mobile",
    },
    {
      title: "头像",
      dataIndex: "avatar",
      render: (avatar: string | undefined) =>
        avatar ? (
          <AntdImage src={avatar} width={32} height={32} alt="" />
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
    },
    {
      title: "简介",
      dataIndex: "introduction",
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
      render: (_, record) => {
        const self = isCurrentUser(record);
        return (
          <Space>
            <Button type="link" onClick={() => openEditModal(record)}>
              编辑
            </Button>
            <Tooltip
              title={
                self
                  ? "不能为自己分配角色，避免出现权限错乱；请使用其他管理员账号操作。"
                  : undefined
              }
            >
              <Button
                type="link"
                disabled={self}
                onClick={() => !self && handleOpenRoleModal(record)}
              >
                分配角色
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button
          onClick={() => fetchData(pagination.current, pagination.pageSize)}
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
        title="编辑用户"
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          setUserModalOpen(false);
          setEditingUser(null);
          setUsernameEditConfirmed(false);
        }}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form<UserFormValues> form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
            extra={
              <Typography.Text type="danger">
                请谨慎修改，用户名变更会影响该用户登录。
              </Typography.Text>
            }
          >
            <Input
              placeholder="用于登录的账号名"
              disabled={!usernameEditConfirmed}
            />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={usernameEditConfirmed}
              onChange={(e) => setUsernameEditConfirmed(e.target.checked)}
            >
              我已知情并确认：修改用户名会影响该用户登录
            </Checkbox>
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input placeholder="显示使用的昵称" />
          </Form.Item>
          <Form.Item
            label="手机号"
            name="mobile"
            rules={[
              {
                validator: async (_, v) => {
                  const s = v != null ? String(v).trim() : "";
                  if (!s) return;
                  if (!/^1\d{10}$/.test(s)) {
                    throw new Error("请输入以 1 开头的 11 位手机号");
                  }
                },
              },
            ]}
          >
            <Input placeholder="11 位手机号码" maxLength={11} allowClear />
          </Form.Item>
          <Form.Item label="头像" name="avatar">
            <Input placeholder="头像图片 URL" allowClear />
          </Form.Item>
          <Form.Item label="简介" name="introduction">
            <Input.TextArea
              rows={3}
              placeholder="个人简介"
              showCount
              maxLength={255}
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
        onCancel={() => {
          setRoleModalUser(null);
          setRoleModalRoleIds([]);
        }}
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
