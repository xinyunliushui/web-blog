import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Table,
  TreeSelect,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { rbacApiService } from "../../services/rbacApi";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import type { Role } from "../../types/rbac";
import {
  getRequestErrorMessage,
  isFormValidationError,
} from "../../utils/requestError";

type RoleFormValues = {
  name: string;
  keyword: string;
  desc?: string;
  status?: number;
  sort?: number;
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
  const [messageApi, contextHolder] = message.useMessage();
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
  const [checkedMenuIds, setCheckedMenuIds] = useState<string[]>([]);
  const [assignMenuLoading, setAssignMenuLoading] = useState(false);

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
      messageApi.error(getRequestErrorMessage(err, "加载角色数据失败"));
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
      keyword: record.code,
      desc: record.description,
      status: record.status ?? 1,
      sort: record.sort ?? 2,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        await rbacApiService.updateRole(editingRole.id, {
          name: values.name,
          keyword: values.keyword,
          desc: values.desc,
          status: values.status ?? 1,
          sort: values.sort ?? 2,
        });
        messageApi.success("角色编辑成功");
      } else {
        await rbacApiService.createRole({
          name: values.name,
          keyword: values.keyword,
          desc: values.desc,
          status: values.status ?? 1,
          sort: values.sort ?? 2,
        });
        messageApi.success("角色新增成功");
      }
      setEditingRole(null);
      setRoleModalOpen(false);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      if (isFormValidationError(err)) {
        return;
      }
      messageApi.error(getRequestErrorMessage(err, "保存角色失败"));
    }
  };

  const treeData = useMemo<TreeOption[]>(() => {
    const mapNode = (node: MenuTreeNode): TreeOption => {
      const typeLabel =
        node.type === 1 ? "菜单" : node.type === 2 ? "页面" : "按钮";
      return {
        title: `${node.title || node.name} (${typeLabel})`,
        value: String(node.id),
        key: String(node.id),
        children: node.children?.map(mapNode),
      };
    };
    return menuTree.map(mapNode);
  }, [menuTree]);

  const handleOpenResourceModal = async (role: Role) => {
    setResourceModalRole(role);
    setCheckedMenuIds([]);
    setAssignMenuLoading(true);
    try {
      const ids = await rbacApiService.getRoleMenus(role.id);
      setCheckedMenuIds(ids.filter((id) => id !== ""));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      messageApi.error(getRequestErrorMessage(err, "加载角色菜单失败"));
      setCheckedMenuIds(role.resourceIds ?? []);
    } finally {
      setAssignMenuLoading(false);
    }
  };

  const handleSaveRoleMenus = async () => {
    if (!resourceModalRole) return;
    try {
      const selectedMenuIds = checkedMenuIds
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0);

      const parentMap = new Map<number, number>();
      const buildParentMap = (nodes: MenuTreeNode[], parentId?: number) => {
        for (const node of nodes) {
          if (parentId && parentId > 0) {
            parentMap.set(node.id, parentId);
          }
          if (node.children?.length) {
            buildParentMap(node.children, node.id);
          }
        }
      };
      buildParentMap(menuTree);

      const finalIds = new Set<number>(selectedMenuIds);
      for (const id of selectedMenuIds) {
        let parentId = parentMap.get(id);
        while (parentId && parentId > 0) {
          finalIds.add(parentId);
          parentId = parentMap.get(parentId);
        }
      }

      await rbacApiService.updateRoleMenus(
        resourceModalRole.id,
        Array.from(finalIds)
      );
      messageApi.success("角色菜单分配成功");
      setResourceModalRole(null);
      await fetchData(pagination.current, pagination.pageSize);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      messageApi.error(getRequestErrorMessage(err, "更新角色菜单失败"));
    }
  };

  const columns: ColumnsType<Role> = [
    { title: "角色名称", dataIndex: "name" },
    { title: "角色编码", dataIndex: "code" },
    { title: "排序", dataIndex: "sort" },
    {
      title: "状态",
      dataIndex: "status",
      render: (status?: number) =>
        status === 1 ? <Tag color="success">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    { title: "描述", dataIndex: "description" },
    {
      title: "菜单数量",
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
          <Button
            type="link"
            onClick={() => void handleOpenResourceModal(record)}
          >
            分配菜单
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
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
        <Form<RoleFormValues>
          form={form}
          layout="vertical"
          initialValues={{ status: 1, sort: 2 }}
        >
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: "请输入角色名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="角色标识"
            name="keyword"
            rules={[{ required: true, message: "请输入角色标识" }]}
          >
            <Input placeholder="例如 admin / editor" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: "请选择角色状态" }]}
          >
            <Select
              options={[
                { label: "启用", value: 1 },
                { label: "禁用", value: 2 },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="排序"
            name="sort"
            rules={[
              { required: true, message: "请输入排序值" },
              { type: "number", min: 1, max: 999, message: "排序范围 1-999" },
            ]}
          >
            <InputNumber min={1} max={999} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="描述" name="desc">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={resourceModalRole !== null}
        title={
          resourceModalRole
            ? `为角色 ${resourceModalRole.name} 分配菜单`
            : "分配菜单"
        }
        okText="确定"
        cancelText="取消"
        onCancel={() => setResourceModalRole(null)}
        onOk={handleSaveRoleMenus}
        width={640}
        destroyOnClose
      >
        <Spin spinning={assignMenuLoading}>
          <TreeSelect
            style={{ width: "100%" }}
            treeData={treeData}
            value={checkedMenuIds}
            treeCheckable
            showCheckedStrategy={SHOW_PARENT}
            placeholder="请选择菜单权限"
            allowClear
            treeDefaultExpandAll
            disabled={assignMenuLoading}
            onChange={(values) => setCheckedMenuIds(values as string[])}
          />
        </Spin>
      </Modal>
    </>
  );
};

export default RolePage;
