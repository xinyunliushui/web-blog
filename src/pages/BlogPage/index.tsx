import { useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
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

type BlogRecord = {
  id: number;
  title: string;
  content: string;
  summary: string;
  cover_image: string;
  category: string;
  tags: string;
  status: number;
  is_top: boolean;
  author: string;
  created_at?: string;
};

type BlogFormValues = {
  title: string;
  content: string;
  summary: string;
  coverImage: string;
  category?: string;
  tags?: string;
};

type MdAction = {
  key: string;
  label: string;
  wrap?: [string, string];
  linePrefix?: string;
  placeholder?: string;
};

type ListState = {
  current: number;
  pageSize: number;
  total: number;
};

type ListResponseData = {
  content?: unknown[];
  list?: unknown[];
  total?: number;
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 10;

const toText = (v: unknown): string => {
  if (v == null) return "";
  return String(v);
};

const normalizeBlog = (raw: Record<string, unknown>): BlogRecord => {
  const idRaw = raw.id ?? raw.ID ?? 0;
  const statusRaw = raw.status ?? 1;
  return {
    id: Number(idRaw) || 0,
    title: toText(raw.title),
    content: toText(raw.content),
    summary: toText(raw.summary),
    cover_image: toText(raw.cover_image ?? raw.coverImage),
    category: toText(raw.category),
    tags: toText(raw.tags),
    status: Number(statusRaw) || 1,
    is_top: Boolean(raw.is_top),
    author: toText(raw.author),
    created_at: toText(raw.created_at || raw.CreatedAt) || undefined,
  };
};

const getListFromPayload = (payload: unknown): unknown[] => {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as ListResponseData;
  if (Array.isArray(p.content)) return p.content;
  if (Array.isArray(p.list)) return p.list;
  return [];
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderMarkdown = (text: string): string => {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let inUl = false;

  const closeUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      closeUl();
      if (!inCodeBlock) {
        out.push("<pre><code>");
      } else {
        out.push("</code></pre>");
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      out.push(`${line}\n`);
      continue;
    }
    if (!line.trim()) {
      closeUl();
      out.push("<br />");
      continue;
    }
    if (line.startsWith("### ")) {
      closeUl();
      out.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeUl();
      out.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeUl();
      out.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }
    if (line.startsWith("> ")) {
      closeUl();
      out.push(`<blockquote>${line.slice(2)}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${line.replace(/^[-*]\s+/, "")}</li>`);
      continue;
    }
    closeUl();
    out.push(`<p>${line}</p>`);
  }
  closeUl();

  return out
    .join("")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
};

const mdActions: MdAction[] = [
  { key: "h2", label: "H2", linePrefix: "## ", placeholder: "二级标题" },
  { key: "bold", label: "加粗", wrap: ["**", "**"], placeholder: "加粗文本" },
  { key: "italic", label: "斜体", wrap: ["*", "*"], placeholder: "斜体文本" },
  { key: "quote", label: "引用", linePrefix: "> ", placeholder: "引用内容" },
  { key: "code", label: "代码", wrap: ["`", "`"], placeholder: "code" },
  {
    key: "link",
    label: "链接",
    wrap: ["[链接文本](", ")"],
    placeholder: "https://example.com",
  },
  { key: "ul", label: "列表", linePrefix: "- ", placeholder: "列表项" },
];

export const BlogPage = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [pagination, setPagination] = useState<ListState>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [form] = Form.useForm<BlogFormValues>();
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const [contentPreview, setContentPreview] = useState("");

  const fetchBlogs = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const res = await http.get(API_PATHS.blogList, {
        params: { page, pageSize },
      });
      const payload = (res.data?.data ?? {}) as ListResponseData;
      const list = getListFromPayload(payload).map((item) =>
        normalizeBlog((item ?? {}) as Record<string, unknown>)
      );
      setBlogs(list);
      setPagination({
        current: Number(payload.page ?? page) || page,
        pageSize: Number(payload.pageSize ?? pageSize) || pageSize,
        total: Number(payload.total ?? 0),
      });
    } catch (err) {
      messageApi.error(getRequestErrorMessage(err, "加载文章列表失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBlogs(1, DEFAULT_PAGE_SIZE);
  }, []);

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreateSubmitting(true);
      await http.post(API_PATHS.blogCreate, {
        title: values.title,
        content: values.content,
        summary: values.summary,
        cover_image: values.coverImage,
        category: values.category ?? "",
        tags: values.tags ?? "",
      });
      messageApi.success("新增文章成功");
      setCreateOpen(false);
      form.resetFields();
      setContentPreview("");
      await fetchBlogs(1, pagination.pageSize);
    } catch (err) {
      if (isFormValidationError(err)) return;
      messageApi.error(getRequestErrorMessage(err, "新增文章失败"));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const applyMdAction = (action: MdAction) => {
    const editor = contentRef.current;
    if (!editor) return;
    const origin = form.getFieldValue("content") || "";
    const start = editor.selectionStart ?? origin.length;
    const end = editor.selectionEnd ?? origin.length;
    const selected = origin.slice(start, end) || action.placeholder || "";
    let injected = selected;

    if (action.wrap) {
      injected = `${action.wrap[0]}${selected}${action.wrap[1]}`;
    } else if (action.linePrefix) {
      injected = selected
        .split("\n")
        .map((line: string) => `${action.linePrefix}${line || action.placeholder || ""}`)
        .join("\n");
    }

    const next = `${origin.slice(0, start)}${injected}${origin.slice(end)}`;
    form.setFieldValue("content", next);
    setContentPreview(next);
    setTimeout(() => {
      editor.focus();
      const cursor = start + injected.length;
      editor.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const columns: ColumnsType<BlogRecord> = [
    {
      title: "标题",
      dataIndex: "title",
      ellipsis: true,
      render: (title: string, record) => (
        <Space size={6}>
          <span>{title || "-"}</span>
          {record.is_top ? <Tag color="gold">置顶</Tag> : null}
        </Space>
      ),
    },
    {
      title: "分类",
      dataIndex: "category",
      render: (category: string) => category || "-",
    },
    {
      title: "标签",
      dataIndex: "tags",
      ellipsis: true,
      render: (tags: string) => tags || "-",
    },
    {
      title: "作者",
      dataIndex: "author",
      render: (author: string) => author || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      render: (status: number) =>
        status === 2 ? (
          <Tag color="success">已发布</Tag>
        ) : status === 3 ? (
          <Tag color="default">私密</Tag>
        ) : (
          <Tag color="processing">草稿</Tag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => messageApi.info(`编辑：${record.title}`)}>
            编辑
          </Button>
          <Button type="link" onClick={() => messageApi.info(`发布/下线：${record.title}`)}>
            发布/下线
          </Button>
          <Button type="link" onClick={() => messageApi.info(`置顶：${record.title}`)}>
            置顶
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          新增文章
        </Button>
        <Button onClick={() => fetchBlogs(pagination.current, pagination.pageSize)}>
          刷新
        </Button>
      </Space>

      <Table<BlogRecord>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={blogs}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            void fetchBlogs(page, pageSize);
          },
        }}
      />

      <Modal
        open={createOpen}
        title="新增文章"
        okText="提交"
        cancelText="取消"
        confirmLoading={createSubmitting}
        onCancel={() => {
          if (createSubmitting) return;
          setCreateOpen(false);
          form.resetFields();
          setContentPreview("");
        }}
        onOk={submitCreate}
        destroyOnClose
        width={760}
      >
        <Form<BlogFormValues> form={form} layout="vertical">
          <Form.Item
            label="标题"
            name="title"
            rules={[
              { required: true, message: "请输入标题" },
              { max: 100, message: "标题最多 100 字" },
            ]}
          >
            <Input placeholder="请输入标题" maxLength={100} />
          </Form.Item>
          <Form.Item
            label="摘要"
            name="summary"
            rules={[
              { required: true, message: "请输入摘要" },
              { max: 500, message: "摘要最多 500 字" },
            ]}
          >
            <Input.TextArea rows={3} placeholder="请输入摘要" maxLength={500} showCount />
          </Form.Item>
          <Form.Item
            label="封面地址"
            name="coverImage"
            rules={[
              { required: true, message: "请输入封面地址" },
              { max: 255, message: "封面地址最多 255 字" },
            ]}
          >
            <Input placeholder="请输入封面 URL" maxLength={255} />
          </Form.Item>
          <Form.Item label="分类" name="category" rules={[{ max: 255, message: "分类最多 255 字" }]}>
            <Input placeholder="例如：后端开发" maxLength={255} />
          </Form.Item>
          <Form.Item label="标签" name="tags" rules={[{ max: 255, message: "标签最多 255 字" }]}>
            <Input placeholder="多个标签可使用逗号分隔" maxLength={255} />
          </Form.Item>
          <Form.Item
            label="正文"
            name="content"
            rules={[
              { required: true, message: "请输入正文内容" },
              { max: 20000, message: "正文最多 20000 字" },
            ]}
          >
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                {mdActions.map((action) => (
                  <Button
                    key={action.key}
                    size="small"
                    onClick={() => applyMdAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
              <Form.Item noStyle shouldUpdate>
                {() => (
                  <Input.TextArea
                    ref={contentRef}
                    rows={10}
                    placeholder="请输入 Markdown 内容"
                    maxLength={20000}
                    showCount
                    value={form.getFieldValue("content")}
                    onChange={(e) => {
                      form.setFieldValue("content", e.target.value);
                      setContentPreview(e.target.value);
                    }}
                  />
                )}
              </Form.Item>
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: 12,
                  background: "#fafafa",
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 8 }}>Markdown 预览</div>
                <div
                  style={{ minHeight: 80, lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(contentPreview || form.getFieldValue("content") || ""),
                  }}
                />
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BlogPage;
