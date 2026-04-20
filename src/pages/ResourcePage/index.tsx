import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import {
  getRequestErrorMessage,
  isFormValidationError,
} from "../../utils/requestError";

type ResourceFormValues = {
  name: string;
  title: string;
  icon?: string;
  type: 1 | 2 | 3;
  path: string;
  redirect?: string;
  parentId?: number;
  sort?: number;
  status?: 1 | 2;
};

type MenuItem = {
  id: number;
  name: string;
  title: string;
  icon?: string;
  path: string;
  redirect?: string;
  sort: number;
  status: 1 | 2;
  type: 1 | 2 | 3;
  parentId: number;
  creator?: string;
  children?: MenuItem[];
};

export const ResourcePage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<MenuItem[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [form] = Form.useForm<ResourceFormValues>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await http.get(API_PATHS.menuTree);
      setResources((res.data?.data ?? []) as MenuItem[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      messageApi.error(getRequestErrorMessage(err, "加载资源数据失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const keys: React.Key[] = [];
    const walk = (nodes: MenuItem[]) => {
      nodes.forEach((node) => {
        keys.push(node.id);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };
    walk(resources);
    setExpandedRowKeys(keys);
  }, [resources]);

  const openCreateModal = () => {
    setEditing(null);
    setResourceModalOpen(true);
    form.resetFields();
    form.setFieldsValue({ type: 1, status: 1, sort: 999, parentId: 0 });
  };

  const openEditModal = (record: MenuItem) => {
    setEditing(record);
    setResourceModalOpen(true);
    form.setFieldsValue({
      name: record.name,
      title: record.title,
      icon: record.icon ?? "",
      type: record.type,
      path: record.path,
      redirect: record.redirect ?? "",
      parentId: record.parentId ?? 0,
      sort: record.sort ?? 999,
      status: record.status ?? 1,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name.trim(),
        title: values.title.trim(),
        icon: values.icon?.trim() ?? "",
        path: values.path.trim(),
        redirect: values.redirect?.trim() ?? "",
        sort: values.sort ?? 999,
        status: editing ? values.status ?? 1 : 1,
        Type: values.type,
        parentId: values.parentId ?? 0,
      };
      if (editing) {
        await http.post(
          `${API_PATHS.menuUpdate}/${encodeURIComponent(String(editing.id))}`,
          payload
        );
        messageApi.success("资源编辑成功");
      } else {
        await http.post(API_PATHS.menuCreate, payload);
        messageApi.success("资源新增成功");
      }
      setEditing(null);
      setResourceModalOpen(false);
      await fetchData();
    } catch (err) {
      if (isFormValidationError(err)) {
        return;
      }
      messageApi.error(getRequestErrorMessage(err, "保存资源失败"));
    }
  };

  const typeTag = (type: 1 | 2 | 3) => {
    if (type === 1) return <Tag color="blue">菜单</Tag>;
    if (type === 2) return <Tag color="green">页面</Tag>;
    return <Tag color="purple">按钮</Tag>;
  };

  const columns: ColumnsType<MenuItem> = [
    { title: "名称", dataIndex: "name" },
    { title: "标题", dataIndex: "title" },
    {
      title: "类型",
      dataIndex: "type",
      render: (t: 1 | 2 | 3) => typeTag(t),
    },
    {
      title: "路由路径",
      dataIndex: "path",
      render: (value?: string) => value || "-",
    },
    {
      title: "父级资源",
      dataIndex: "parentId",
      render: (parentId?: number) => {
        if (!parentId) return "根节点";
        return parentTitleMap.get(parentId) ?? parentId;
      },
    },
    { title: "排序", dataIndex: "sort" },
    {
      title: "状态",
      dataIndex: "status",
      render: (s: 1 | 2) =>
        s === 1 ? (
          <Tag color="success">正常</Tag>
        ) : (
          <Tag color="error">禁用</Tag>
        ),
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const flatResources = useMemo(() => {
    const list: MenuItem[] = [];
    const walk = (nodes: MenuItem[]) => {
      nodes.forEach((node) => {
        list.push(node);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };
    walk(resources);
    return list;
  }, [resources]);

  const parentTitleMap = useMemo(() => {
    const m = new Map<number, string>();
    flatResources.forEach((item) => m.set(item.id, item.title));
    return m;
  }, [flatResources]);

  const parentOptions = flatResources.map((res) => ({
    label: `${res.title} (${res.path || "-"})`,
    value: res.id,
  }));

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreateModal}>
          新增资源
        </Button>
        <Button onClick={fetchData}>刷新</Button>
      </Space>
      <Table<MenuItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={resources}
        expandedRowKeys={expandedRowKeys}
        onExpandedRowsChange={(keys) => setExpandedRowKeys(keys)}
      />

      <Modal
        open={resourceModalOpen}
        title={editing ? "编辑菜单" : "新增菜单"}
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          setResourceModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form<ResourceFormValues> form={form} layout="vertical">
          <Form.Item
            label="资源名称(英文)"
            name="name"
            rules={[{ required: true, message: "请输入资源名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="资源标题(中文)"
            name="title"
            rules={[{ required: true, message: "请输入标题" }]}
          >
            <Input placeholder="例如 用户管理" />
          </Form.Item>
          <Form.Item label="图标" name="icon">
            <Input placeholder="例如 UserOutlined" />
          </Form.Item>
          <Form.Item
            label="资源类型"
            name="type"
            rules={[{ required: true, message: "请选择资源类型" }]}
          >
            <Select<number>>
              <Select.Option value={1}>菜单</Select.Option>
              <Select.Option value={2}>页面</Select.Option>
              <Select.Option value={3}>按钮</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="路由路径"
            name="path"
            rules={[{ required: true, message: "请输入路由路径" }]}
          >
            <Input placeholder="例如 system / users / /system/users" />
          </Form.Item>
          <Form.Item label="重定向路径" name="redirect">
            <Input placeholder="可选，例如 /system/users" />
          </Form.Item>
          <Form.Item label="父级资源" name="parentId">
            <Select
              options={[{ label: "根节点", value: 0 }, ...parentOptions]}
              placeholder="默认根节点"
            />
          </Form.Item>
          <Form.Item label="排序号" name="sort">
            <InputNumber min={1} max={999} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              disabled={!editing}
              options={[
                { label: "正常", value: 1 },
                { label: "禁用", value: 2 },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ResourcePage;
