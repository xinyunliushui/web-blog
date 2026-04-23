import { useEffect, useMemo, useState } from "react";
import { Button, Divider, Image as AntdImage, Spin, Tag, Typography, message } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { renderMarkdown } from "../../components/MarkdownEditor";
import { API_PATHS } from "../../config/api";
import http from "../../services/http";
import { getRequestErrorMessage } from "../../utils/requestError";

type BlogDetail = {
  id: number;
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
  id: Number(raw.id ?? raw.ID ?? 0) || 0,
  title: toText(raw.title),
  summary: toText(raw.summary),
  content: toText(raw.content),
  coverImage: toText(raw.coverImage ?? raw.cover_image),
  category: toText(raw.category) || undefined,
  tags: toText(raw.tags) || undefined,
  publishedAt: toText(raw.publishedAt ?? raw.published_at ?? raw.CreatedAt) || undefined,
});

export const BlogDetailPage = () => {
  const navigate = useNavigate();
  const { blogId } = useParams<{ blogId: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<BlogDetail | null>(null);

  const html = useMemo(() => renderMarkdown(detail?.content ?? ""), [detail?.content]);

  useEffect(() => {
    const id = Number(blogId);
    if (!Number.isFinite(id) || id <= 0) {
      messageApi.error("文章ID不正确");
      navigate("/blogs", { replace: true });
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await http.get(`${API_PATHS.blogDetail}/${encodeURIComponent(String(id))}`, {
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

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      {contextHolder}
      <Button style={{ marginBottom: 16 }} onClick={() => navigate("/blogs")}>
        返回列表
      </Button>
      <Spin spinning={loading}>
        {detail ? (
          <article>
            <Typography.Title level={1} style={{ marginBottom: 8 }}>
              {detail.title || "-"}
            </Typography.Title>
            <Typography.Text type="secondary">
              发布时间：{detail.publishedAt ? new Date(detail.publishedAt).toLocaleString() : "未发布"}
            </Typography.Text>
            <Divider />
            {detail.coverImage ? (
              <AntdImage
                src={detail.coverImage}
                alt={detail.title}
                width="100%"
                style={{ borderRadius: 10, marginBottom: 16, objectFit: "cover" }}
              />
            ) : null}
            <Typography.Paragraph
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                background: "#fafafa",
                borderLeft: "4px solid #1677ff",
                padding: "12px 14px",
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
              style={{ lineHeight: 1.9, fontSize: 16 }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        ) : null}
      </Spin>
    </div>
  );
};

export default BlogDetailPage;
