import { useCallback, useEffect, useRef, useState } from "react";
import { SearchOutlined } from "@ant-design/icons";
import {
  Card,
  Grid,
  Image as AntdImage,
  Input,
  List,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import { getRequestErrorMessage } from "../../utils/requestError";
import styles from "./index.module.css";

type BlogListItem = {
  id: number;
  title: string;
  summary: string;
  coverImage: string;
  category?: string;
  tags?: string;
  fromSearch?: boolean;
  /** 有值则用 HTML 渲染标题（含 &lt;mark&gt; 等） */
  searchTitleHtml?: string;
  /** 有值则用 HTML 渲染摘要区（优先 ES highlight 片段） */
  searchSnippetHtml?: string;
};

type ListResponseData = {
  content?: unknown[];
  list?: unknown[];
};

type SearchResponseData = {
  hits?: unknown[];
  total?: number;
  took_ms?: number;
  suggestion?: string;
};

const LIST_PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 10;
/** 输入防抖，减少 ES 请求频率 */
const SEARCH_DEBOUNCE_MS = 400;

const toText = (v: unknown): string => (v == null ? "" : String(v));

const normalizeBlog = (raw: Record<string, unknown>): BlogListItem => ({
  id: Number(raw.id ?? raw.ID ?? 0) || 0,
  title: toText(raw.title),
  summary: toText(raw.summary),
  coverImage: toText(raw.coverImage ?? raw.cover_image),
  category: toText(raw.category) || undefined,
  tags: toText(raw.tags) || undefined,
});

const HL_GAP =
  '<span aria-hidden="true" style="color:rgba(0,0,0,0.22);margin:0 6px;font-weight:normal">…</span>';

const readHighlightFragments = (
  raw: Record<string, unknown>,
  field: string
): string[] => {
  const h = raw.highlight;
  if (!h || typeof h !== "object") return [];
  const arr = (h as Record<string, unknown>)[field];
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === "string" && x.trim() !== "");
};

const containsHighlightMarkup = (s: string): boolean =>
  /<mark\b/i.test(s) || /<em\b/i.test(s);

const joinSnippetFragments = (parts: string[], max = 2): string =>
  parts.slice(0, max).join(HL_GAP);

/**
 * 对齐后端 SearchResultDTO：title/summary/content 可能已由 HighlightOrFallback 拼好；
 * highlight.title / highlight.content 等为原始片段数组，列表优先用片段展示正文命中。
 */
const normalizeSearchHit = (raw: Record<string, unknown>): BlogListItem => {
  const cat = raw.category;
  const tags = raw.tags;
  const titleStr = toText(raw.title);
  const summaryStr = toText(raw.summary);
  const contentStr = toText(raw.content);

  const titleFr = readHighlightFragments(raw, "title");
  const summaryFr = readHighlightFragments(raw, "summary");
  const contentFr = readHighlightFragments(raw, "content");

  let searchTitleHtml: string | undefined;
  if (titleFr.length > 0) {
    searchTitleHtml = titleFr[0];
  } else if (containsHighlightMarkup(titleStr)) {
    searchTitleHtml = titleStr;
  }

  let searchSnippetHtml: string | undefined;
  if (contentFr.length > 0) {
    searchSnippetHtml = joinSnippetFragments(contentFr);
  } else if (summaryFr.length > 0) {
    searchSnippetHtml = joinSnippetFragments(summaryFr);
  } else if (containsHighlightMarkup(summaryStr)) {
    searchSnippetHtml = summaryStr;
  } else if (
    containsHighlightMarkup(contentStr) &&
    contentStr.length <= 1400
  ) {
    searchSnippetHtml = contentStr;
  }

  return {
    id: Number(raw.id ?? raw.ID ?? 0) || 0,
    title: titleStr,
    summary: summaryStr,
    coverImage: toText(raw.coverImage ?? raw.cover_image),
    category: cat != null ? toText(cat) || undefined : undefined,
    tags: tags != null ? toText(tags) || undefined : undefined,
    fromSearch: true,
    searchTitleHtml,
    searchSnippetHtml,
  };
};

export const BlogPublicListPage = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<BlogListItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [searchMeta, setSearchMeta] = useState<{
    tookMs: number;
    suggestion: string;
  } | null>(null);
  const [searchPagination, setSearchPagination] = useState({
    current: 1,
    pageSize: SEARCH_PAGE_SIZE,
    total: 0,
  });

  /** 丢弃过期的异步列表结果（快速输入时旧请求后返回会覆盖新结果） */
  const fetchSeqRef = useRef(0);
  const searchPageSizeRef = useRef(SEARCH_PAGE_SIZE);
  searchPageSizeRef.current = searchPagination.pageSize;

  const loadPublishedList = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const res = await http.get(API_PATHS.blogList, {
        params: { page: 1, pageSize: LIST_PAGE_SIZE, status: 2 },
        silent: true,
      });
      if (seq !== fetchSeqRef.current) return;
      const payload = (res.data?.data ?? {}) as ListResponseData;
      const rawList = Array.isArray(payload.content)
        ? payload.content
        : Array.isArray(payload.list)
          ? payload.list
          : [];
      setList(
        rawList.map((item) => normalizeBlog((item ?? {}) as Record<string, unknown>))
      );
      setSearchMeta(null);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      messageApi.error(getRequestErrorMessage(err, "加载博客列表失败"));
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [messageApi]);

  const loadSearch = useCallback(
    async (page: number, pageSize: number, keyword: string) => {
      const kw = keyword.trim();
      if (!kw) return;
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      try {
        const res = await http.get(API_PATHS.blogSearch, {
          params: { page, pageSize, keyword: kw },
          silent: true,
        });
        if (seq !== fetchSeqRef.current) return;
        const data = (res.data?.data ?? {}) as SearchResponseData;
        const hits = Array.isArray(data.hits) ? data.hits : [];
        setList(
          hits.map((item) =>
            normalizeSearchHit((item ?? {}) as Record<string, unknown>)
          )
        );
        setSearchPagination({
          current: page,
          pageSize,
          total: Number(data.total ?? 0),
        });
        setSearchMeta({
          tookMs: Number(data.took_ms ?? 0),
          suggestion: data.suggestion != null ? String(data.suggestion) : "",
        });
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        setSearchMeta(null);
        messageApi.error(getRequestErrorMessage(err, "搜索失败"));
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [messageApi]
  );

  useEffect(() => {
    const kw = searchInput.trim();
    if (!kw) {
      setAppliedKeyword("");
      setSearchMeta(null);
      void loadPublishedList();
      return;
    }
    const timer = window.setTimeout(() => {
      setAppliedKeyword(kw);
      void loadSearch(1, searchPageSizeRef.current, kw);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput, loadPublishedList, loadSearch]);

  const isSearchMode = appliedKeyword.trim().length > 0;

  return (
    <div
      style={{
        maxWidth: 980,
        margin: isMobile ? "12px auto" : "24px auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      {contextHolder}

      <Input
        placeholder="输入即搜索：标题、摘要、正文"
        allowClear
        size="large"
        style={{ marginBottom: isMobile ? 14 : 18 }}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        prefix={<SearchOutlined style={{ color: "rgba(0,0,0,0.45)" }} />}
      />

      <Typography.Title level={isMobile ? 3 : 2} style={{ marginBottom: isMobile ? 14 : 20 }}>
        博客文章
      </Typography.Title>

      {isSearchMode && searchMeta ? (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8, marginBottom: 16 }}>
          关键词「{appliedKeyword.trim()}」· 约 {searchPagination.total} 条结果 · 耗时{" "}
          {searchMeta.tookMs} ms
          {searchMeta.suggestion ? (
            <>
              {" "}
              · 您是否要找：<Typography.Text strong>{searchMeta.suggestion}</Typography.Text>
            </>
          ) : null}
        </Typography.Paragraph>
      ) : null}

      <Spin spinning={loading}>
        <List
          itemLayout="vertical"
          dataSource={list}
          locale={{
            emptyText: isSearchMode ? "未找到相关文章" : "暂无已发布文章",
          }}
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
                    {item.coverImage ? (
                      <AntdImage
                        src={item.coverImage}
                        alt={item.title}
                        preview={false}
                        width={isMobile ? "100%" : 220}
                        height={isMobile ? 180 : 130}
                        wrapperStyle={{
                          width: isMobile ? "100%" : undefined,
                          lineHeight: 0,
                        }}
                        style={{
                          objectFit: "cover",
                          borderRadius: 6,
                          flexShrink: 0,
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: isMobile ? "100%" : 220,
                          height: isMobile ? 120 : 130,
                          flexShrink: 0,
                          borderRadius: 6,
                          background: "rgba(0,0,0,0.06)",
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text type="secondary">
                        {item.category || "未分类"}
                      </Typography.Text>
                      {item.fromSearch && item.searchTitleHtml ? (
                        <Typography.Title
                          level={isMobile ? 5 : 4}
                          className={`${styles.hitHtml} ${styles.titleClamp}`}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: item.searchTitleHtml || "-",
                            }}
                          />
                        </Typography.Title>
                      ) : (
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
                      )}
                      {item.fromSearch && item.searchSnippetHtml ? (
                        <div
                          className={`${styles.hitHtml} ${styles.snippetClamp}`}
                          dangerouslySetInnerHTML={{
                            __html: item.searchSnippetHtml,
                          }}
                        />
                      ) : (
                        <Typography.Paragraph
                          style={{ marginBottom: 10 }}
                          ellipsis={{ rows: isMobile ? 3 : 2 }}
                        >
                          {item.summary || "-"}
                        </Typography.Paragraph>
                      )}
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

      {isSearchMode ? (
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Pagination
            current={searchPagination.current}
            pageSize={searchPagination.pageSize}
            total={searchPagination.total}
            showSizeChanger
            showTotal={(t) => `共 ${t} 条`}
            pageSizeOptions={["10", "20", "50"]}
            onChange={(page, pageSize) => {
              void loadSearch(page, pageSize, appliedKeyword.trim());
            }}
          />
        </div>
      ) : null}
    </div>
  );
};

export default BlogPublicListPage;
