import { useEffect, useState } from "react";
import { Alert, Button, Space, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useNavigate } from "react-router-dom";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import { getRequestErrorMessage } from "../../utils/requestError";
import { runDeduped } from "../../utils/inflightDedupe";

type BlogRecord = {
  id: string;
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

/** 与后台一致：2 已发布 · 3 已下线（私密）；其余为草稿 */
const BLOG_STATUS_PUBLISHED = 2;
const BLOG_STATUS_OFFLINE = 3;

const isPublishedBlog = (record: BlogRecord) =>
  record.status === BLOG_STATUS_PUBLISHED;

const toText = (v: unknown): string => {
  if (v == null) return "";
  return String(v);
};

const normalizeBlog = (raw: Record<string, unknown>): BlogRecord => {
  const idRaw = raw.id ?? raw.ID ?? "";
  const statusRaw = raw.status ?? 1;
  return {
    id: toText(idRaw),
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

export const BlogPage = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [publishLoadingId, setPublishLoadingId] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [pagination, setPagination] = useState<ListState>({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
  });

  const fetchBlogs = async (
    page: number,
    pageSize: number
  ): Promise<boolean> => {
    return runDeduped(`blog:list:${page}:${pageSize}`, async () => {
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
        return true;
      } catch (err) {
        messageApi.error(getRequestErrorMessage(err, "加载文章列表失败"));
        return false;
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    void fetchBlogs(1, DEFAULT_PAGE_SIZE);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const ok = await fetchBlogs(pagination.current, pagination.pageSize);
      if (ok) {
        messageApi.success("刷新成功");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const updatePublishStatus = async (record: BlogRecord) => {
    const nextStatus =
      record.status === BLOG_STATUS_PUBLISHED
        ? BLOG_STATUS_OFFLINE
        : BLOG_STATUS_PUBLISHED;
    const actionText = nextStatus === 2 ? "发布" : "下线";
    setPublishLoadingId(record.id);
    try {
      await http.post(
        `${API_PATHS.blogUpdatePublish}/${encodeURIComponent(
          String(record.id)
        )}`,
        {
          blogId: record.id,
          status: nextStatus,
        }
      );
      messageApi.success(`${actionText}成功`);
      await fetchBlogs(pagination.current, pagination.pageSize);
    } catch (err) {
      messageApi.error(getRequestErrorMessage(err, `${actionText}失败`));
    } finally {
      setPublishLoadingId(null);
    }
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
      render: (tags: string) => {
        const tagList = String(tags || "")
          .split(/[,，]/)
          .map((item) => item.trim())
          .filter(Boolean);
        if (tagList.length === 0) {
          return "-";
        }
        return (
          <Space size={[4, 4]} wrap>
            {tagList.map((item) => (
              <Tag key={item} color="blue">
                {item}
              </Tag>
            ))}
          </Space>
        );
      },
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
        status === BLOG_STATUS_PUBLISHED ? (
          <Tag color="success">已发布</Tag>
        ) : status === BLOG_STATUS_OFFLINE ? (
          <Tag color="default">已下线</Tag>
        ) : (
          <Tag color="processing">草稿</Tag>
        ),
    },
    {
      title: "操作",
      key: "actions",
      fixed: "right",
      width: 300,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() =>
              navigate(`/blogs/${record.id}`, {
                state: { fromBlogNav: true },
              })
            }
          >
            预览文章
          </Button>
          {isPublishedBlog(record) ? (
            <Tooltip
              title={
                "已上线的文章不能直接编辑，请先点击「下线」。下线后仍为站内可见的线下状态，修改完成后再「发布」即可。"
              }
            >
              <span>
                <Button type="link" disabled>
                  编辑
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              type="link"
              onClick={() =>
                navigate(`/blog/edit/${record.id}`, {
                  state: { blog: record },
                })
              }
            >
              编辑
            </Button>
          )}
          {record.status === BLOG_STATUS_PUBLISHED ? (
            <Button
              type="link"
              loading={publishLoadingId === record.id}
              onClick={() => {
                void updatePublishStatus(record);
              }}
            >
              下线
            </Button>
          ) : (
            <Button
              type="link"
              loading={publishLoadingId === record.id}
              onClick={() => {
                void updatePublishStatus(record);
              }}
            >
              发布
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => navigate("/blog/create")}>
          新增文章
        </Button>
        <Button
          loading={refreshing}
          onClick={() => {
            void handleRefresh();
          }}
        >
          刷新
        </Button>
      </Space>

      <Table<BlogRecord>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={blogs}
        scroll={{ x: "max-content" }}
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
    </>
  );
};

export default BlogPage;
