import { useEffect, useState } from 'react';
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { rbacApiService } from '../../services/rbacApi';
import type { Resource, ResourceType } from '../../types/rbac';

type ResourceFormValues = {
  name: string;
  code: string;
  type: ResourceType;
  path?: string;
  parentId?: string | null;
  order?: number;
  description?: string;
};

export const ResourcePage = () => {
  const [loading, setLoading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [form] = Form.useForm<ResourceFormValues>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await rbacApiService.listResources();
      setResources(list);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      message.error('加载资源数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditing(null);
    setResourceModalOpen(true);
    form.resetFields();
    form.setFieldsValue({ type: 'menu' });
  };

  const openEditModal = (record: Resource) => {
    setEditing(record);
    setResourceModalOpen(true);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      type: record.type,
      path: record.path,
      parentId: record.parentId ?? undefined,
      order: record.order,
      description: record.description,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: Omit<Resource, 'id'> = {
        ...values,
        parentId: values.parentId ?? null,
      };
      if (editing) {
        await rbacApiService.updateResource(editing.id, payload);
        message.success('更新资源成功');
      } else {
        await rbacApiService.createResource(payload);
        message.success('创建资源成功');
      }
      setEditing(null);
      setResourceModalOpen(false);
      await fetchData();
    } catch (err) {
      if (err instanceof Error) {
        return;
      }
      message.error('保存资源失败');
    }
  };

  const handleDelete = async (record: Resource) => {
    Modal.confirm({
      title: '确认删除该资源及其子节点？',
      content: `删除后将无法恢复：${record.name}`,
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await rbacApiService.deleteResource(record.id);
          message.success('删除资源成功');
          await fetchData();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          message.error('删除资源失败');
        }
      },
    });
  };

  const typeTag = (type: ResourceType) => {
    if (type === 'menu') return <Tag color="blue">菜单</Tag>;
    if (type === 'page') return <Tag color="green">页面</Tag>;
    return <Tag color="purple">按钮</Tag>;
  };

  const columns: ColumnsType<Resource> = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    {
      title: '类型',
      dataIndex: 'type',
      render: (t: ResourceType) => typeTag(t),
    },
    {
      title: '路由路径',
      dataIndex: 'path',
      render: (value?: string) => value || '-',
    },
    {
      title: '父级资源',
      dataIndex: 'parentId',
      render: (parentId?: string | null) => {
        if (!parentId) return '-';
        const parent = resources.find((r) => r.id === parentId);
        return parent ? parent.name : parentId;
      },
    },
    { title: '排序', dataIndex: 'order' },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const parentOptions = resources.map((res) => ({
    label: `${res.name} (${res.type})`,
    value: res.id,
  }));

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreateModal}>
          新增资源
        </Button>
        <Button onClick={fetchData}>刷新</Button>
      </Space>
      <Table<Resource>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={resources}
      />

      <Modal
        open={resourceModalOpen}
        title={editing ? '编辑资源' : '新增资源'}
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
            label="资源名称"
            name="name"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="资源编码"
            name="code"
            rules={[{ required: true, message: '请输入资源编码' }]}
          >
            <Input placeholder="例如 menu:user / button:user:create" />
          </Form.Item>
          <Form.Item
            label="资源类型"
            name="type"
            rules={[{ required: true, message: '请选择资源类型' }]}
          >
            <Select<ResourceType>>
              <Select.Option value="menu">菜单</Select.Option>
              <Select.Option value="page">页面</Select.Option>
              <Select.Option value="button">按钮</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="路由路径" name="path">
            <Input placeholder="仅对菜单 / 页面生效，例如 /users" />
          </Form.Item>
          <Form.Item label="父级资源" name="parentId">
            <Select
              allowClear
              options={parentOptions}
              placeholder="可选，用于构建菜单-页面-按钮层级"
            />
          </Form.Item>
          <Form.Item label="排序号" name="order">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ResourcePage;

