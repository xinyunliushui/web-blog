import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  TreeSelect,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { rbacApiService } from "../../services/rbacApi";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import type { Role } from "../../types/rbac";

type RoleFormValues = {
  name: string;
  code: string;
  description?: string;
};

const DEFAULT_PAGE_SIZE = 10;
const { SHOW_PARENT } = TreeSelect;

type MenuTreeNode = {
  id: number;
  title: string;
  name: string;
  type: number;
  children?: MenuTreeNode[];
};

type TreeOption = {
  title: string;
  value: string;
  key: string;
  children?: TreeOption[];
};

export const RolePage = () => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [menuTree, setMenuTree] = useState<MenuTreeNode[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [form] = Form.useForm<RoleFormValues>();

  const [resourceModalRole, setResourceModalRole] = useState<Role | null>(null);
  const [checkedResourceIds, setCheckedResourceIds] = useState<string[]>([]);

  const fetchData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const [roleRes, menuTreeRes] = await Promise.all([
        rbacApiService.listRoles({ page, pageSize }),
        http.get(API_PATHS.menuTree),
      ]);
      setRoles(roleRes.list);
      setPagination({
        current: roleRes.page,
        pageSize: roleRes.pageSize,
        total: roleRes.total,
      });
      setMenuTree((menuTreeRes.data?.data ?? []) as MenuTreeNode[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      message.error("加载角色数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(1, DEFAULT_PAGE_SIZE);
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleModalOpen(true);
    form.resetFields();
  };

  const openEditModal = (record: Role) => {
    setEditingRole(record);
    setRoleModalOpen(true);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        await rbacApiService.updateRole(editingRole.id, values);
        message.success("更新角色成功");
      } else {
        await rbacApiService.createRole({
          ...values,
          resourceIds: [],
        });
        message.success("创建角色成功");
      }
      setEditingRole(null);
      setRoleModalOpen(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err instanceof Error) {
        return;
      }
      message.error("保存角色失败");
    }
  };

  const handleDelete = async (record: Role) => {
    Modal.confirm({
      title: "确认删除该角色？",
      content: `删除后将无法恢复：${record.name}`,
      okText: "删除",
      cancelText: "取消",
      onOk: async () => {
        try {
          await rbacApiService.deleteRole(record.id);
          message.success("删除角色成功");
          await fetchData(pagination.current, pagination.pageSize);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
          message.error("删除角色失败");
        }
      },
    });
  };

  const treeData = useMemo<TreeOption[]>(() => {
    const mapNode = (node: MenuTreeNode): TreeOption => {
      const typeLabel = node.type === 1 ? "菜单" : node.type === 2 ? "页面" : "按钮";
      return {
        title: `${node.title || node.name} (${typeLabel})`,
        value: String(node.id),
        key: String(node.id),
        children: node.children?.map(mapNode),
      };
    };
    return menuTree.map(mapNode);
  }, [menuTree]);

  const handleOpenResourceModal = (role: Role) => {
    setResourceModalRole(role);
    setCheckedResourceIds(role.resourceIds);
  };

  const handleSaveRoleResources = async () => {
    if (!resourceModalRole) return;
    try {
      await rbacApiService.updateRoleResources(
        resourceModalRole.id,
        checkedResourceIds
      );
      message.success("更新角色资源成功");
      setResourceModalRole(null);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      message.error("更新角色资源失败");
    }
  };

  const columns: ColumnsType<Role> = [
    { title: "角色名称", dataIndex: "name" },
    { title: "角色编码", dataIndex: "code" },
    { title: "描述", dataIndex: "description" },
    {
      title: "资源数量",
      dataIndex: "resourceIds",
      render: (list: string[]) => list?.length ?? 0,
    },
    {
      title: "操作",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Button type="link" onClick={() => handleOpenResourceModal(record)}>
            分配资源
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
          新增角色
        </Button>
        <Button
          onClick={() => fetchData(pagination.current, pagination.pageSize)}
        >
          刷新
        </Button>
      </Space>
      <Table<Role>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={roles}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => {
            void fetchData(page, pageSize);
          },
        }}
      />

      <Modal
        open={roleModalOpen}
        title={editingRole ? "编辑角色" : "新增角色"}
        okText="确定"
        cancelText="取消"
        onCancel={() => {
          setRoleModalOpen(false);
          setEditingRole(null);
        }}
        onOk={handleSubmit}
        destroyOnClose
      >
        <Form<RoleFormValues> form={form} layout="vertical">
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="角色编码"
            name="code"
            rules={[{ required: true, message: "请输入角色编码" }]}
          >
            <Input placeholder="例如 admin / editor" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={resourceModalRole !== null}
        title={
          resourceModalRole
            ? `为角色 ${resourceModalRole.name} 分配资源`
            : "分配资源"
        }
        okText="确定"
        cancelText="取消"
        onCancel={() => setResourceModalRole(null)}
        onOk={handleSaveRoleResources}
        width={640}
        destroyOnClose
      >
        <TreeSelect
          style={{ width: "100%" }}
          treeData={treeData}
          value={checkedResourceIds}
          treeCheckable
          showCheckedStrategy={SHOW_PARENT}
          placeholder="请选择菜单资源"
          allowClear
          treeDefaultExpandAll
          onChange={(values) => setCheckedResourceIds(values as string[])}
        />
      </Modal>
    </>
  );
};

export default RolePage;
