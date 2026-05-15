import { useEffect, useMemo, useState } from "react";
import { Button, Divider, Grid, Image as AntdImage, Spin, Tag, Typography, message } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { renderMarkdown } from "../../components/MarkdownEditor";
import { API_PATHS } from "../../config/api";
import http from "../../services/http";
import { getRequestErrorMessage } from "../../utils/requestError";

type BlogDetail = {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string;
  category?: string;
  tags?: string;
  publishedAt?: string;
};

const toText = (v: unknown): string => (v == null ? "" : String(v));

const normalizeBlogDetail = (raw: Record<string, unknown>): BlogDetail => ({
  id: toText(raw.id ?? raw.ID),
  title: toText(raw.title),
  summary: toText(raw.summary),
  content: toText(raw.content),
  coverImage: toText(raw.coverImage ?? raw.cover_image),
  category: toText(raw.category) || undefined,
  tags: toText(raw.tags) || undefined,
  publishedAt: toText(raw.publishedAt ?? raw.published_at ?? raw.CreatedAt) || undefined,
});

type BlogDetailLocationState = {
  /** 由站内列表/管理预览进入时为 true，返回时使用 history.back */
  fromBlogNav?: boolean;
};

export const BlogDetailPage = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const location = useLocation();
  const { blogId } = useParams<{ blogId: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<BlogDetail | null>(null);

  const html = useMemo(() => renderMarkdown(detail?.content ?? ""), [detail?.content]);

  useEffect(() => {
    const id = (blogId ?? "").trim();
    if (!id) {
      messageApi.error("文章ID不正确");
      navigate("/blogs", { replace: true });
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await http.get(`${API_PATHS.blogDetail}/${encodeURIComponent(id)}`, {
          silent: true,
        });
        setDetail(normalizeBlogDetail((res.data?.data ?? {}) as Record<string, unknown>));
      } catch (err) {
        messageApi.error(getRequestErrorMessage(err, "加载文章详情失败"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [blogId, messageApi, navigate]);

  const tags = String(detail?.tags ?? "")
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleBackToList = () => {
    const fromBlogNav = (location.state as BlogDetailLocationState | null)
      ?.fromBlogNav;
    if (fromBlogNav) {
      window.history.back();
      return;
    }
    navigate("/blogs");
  };

  return (
    <div
      style={{
        maxWidth: 980,
        margin: isMobile ? "12px auto" : "24px auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      {contextHolder}
      <Button style={{ marginBottom: 16 }} onClick={handleBackToList}>
        返回列表
      </Button>
      <Spin spinning={loading}>
        {detail ? (
          <article>
            <Typography.Title level={isMobile ? 2 : 1} style={{ marginBottom: 8 }}>
              {detail.title || "-"}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
              发布时间：{detail.publishedAt ? new Date(detail.publishedAt).toLocaleString() : "未发布"}
            </Typography.Text>
            <Divider />
            {detail.coverImage ? (
              <AntdImage
                src={detail.coverImage}
                alt={detail.title}
                width="100%"
                wrapperStyle={{ display: "block", lineHeight: 0, marginBottom: 16 }}
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: 10,
                  objectFit: "cover",
                  maxHeight: isMobile ? 240 : 520,
                }}
              />
            ) : null}
            <Typography.Paragraph
              style={{
                fontSize: isMobile ? 14 : 16,
                lineHeight: 1.8,
                background: "#fafafa",
                borderLeft: "4px solid #1677ff",
                padding: isMobile ? "10px 12px" : "12px 14px",
                borderRadius: 6,
              }}
            >
              {detail.summary || "-"}
            </Typography.Paragraph>
            <div style={{ marginBottom: 12 }}>
              {detail.category ? <Tag color="geekblue">{detail.category}</Tag> : null}
              {tags.map((tag) => (
                <Tag key={tag} color="blue">
                  {tag}
                </Tag>
              ))}
            </div>
            <Divider />
            <div
              style={{
                lineHeight: 1.9,
                fontSize: isMobile ? 15 : 16,
                overflowX: "auto",
                wordBreak: "break-word",
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        ) : null}
      </Spin>
    </div>
  );
};

export default BlogDetailPage;
