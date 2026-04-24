import { useEffect, useState } from "react";
import { Card, Grid, Image as AntdImage, List, Space, Spin, Tag, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import { getRequestErrorMessage } from "../../utils/requestError";

type BlogListItem = {
  id: number;
  title: string;
  summary: string;
  coverImage: string;
  category?: string;
  tags?: string;
};

type ListResponseData = {
  content?: unknown[];
  list?: unknown[];
};

const toText = (v: unknown): string => (v == null ? "" : String(v));

const normalizeBlog = (raw: Record<string, unknown>): BlogListItem => ({
  id: Number(raw.id ?? raw.ID ?? 0) || 0,
  title: toText(raw.title),
  summary: toText(raw.summary),
  coverImage: toText(raw.coverImage ?? raw.cover_image),
  category: toText(raw.category) || undefined,
  tags: toText(raw.tags) || undefined,
});

export const BlogPublicListPage = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<BlogListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await http.get(API_PATHS.blogList, {
          params: { page: 1, pageSize: 100, status: 2 },
          silent: true,
        });
        const payload = (res.data?.data ?? {}) as ListResponseData;
        const rawList = Array.isArray(payload.content)
          ? payload.content
          : Array.isArray(payload.list)
          ? payload.list
          : [];
        setList(
          rawList.map((item) => normalizeBlog((item ?? {}) as Record<string, unknown>))
        );
      } catch (err) {
        messageApi.error(getRequestErrorMessage(err, "加载博客列表失败"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [messageApi]);

  return (
    <div
      style={{
        maxWidth: 980,
        margin: isMobile ? "12px auto" : "24px auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      {contextHolder}
      <Typography.Title level={isMobile ? 3 : 2} style={{ marginBottom: isMobile ? 14 : 20 }}>
        博客文章
      </Typography.Title>
      <Spin spinning={loading}>
        <List
          itemLayout="vertical"
          dataSource={list}
          locale={{ emptyText: "暂无已发布文章" }}
          renderItem={(item) => {
            const tags = String(item.tags ?? "")
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean);
            return (
              <List.Item
                key={item.id}
                style={{ cursor: "pointer", paddingBlock: isMobile ? 10 : 16 }}
                onClick={() => navigate(`/blogs/${item.id}`)}
              >
                <Card hoverable bodyStyle={{ padding: isMobile ? 12 : 16 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: isMobile ? 10 : 16,
                      flexDirection: isMobile ? "column" : "row",
                    }}
                  >
                    <AntdImage
                      src={item.coverImage}
                      alt={item.title}
                      preview={false}
                      width={isMobile ? "100%" : 220}
                      height={isMobile ? 180 : 130}
                      wrapperStyle={{ width: isMobile ? "100%" : undefined, lineHeight: 0 }}
                      style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0, display: "block" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text type="secondary">
                        {item.category || "未分类"}
                      </Typography.Text>
                      <Typography.Title
                        level={isMobile ? 5 : 4}
                        style={{
                          margin: "6px 0 8px",
                          whiteSpace: isMobile ? "normal" : "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title || "-"}
                      </Typography.Title>
                      <Typography.Paragraph
                        style={{ marginBottom: 10 }}
                        ellipsis={{ rows: isMobile ? 3 : 2 }}
                      >
                        {item.summary || "-"}
                      </Typography.Paragraph>
                      <Space size={[6, 6]} wrap>
                        {tags.map((tag) => (
                          <Tag key={tag} color="blue">
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      </Spin>
    </div>
  );
};

export default BlogPublicListPage;
