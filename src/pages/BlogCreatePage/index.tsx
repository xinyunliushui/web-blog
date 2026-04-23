import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, Space, message, Image as AntdImage } from "antd";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import http from "../../services/http";
import { API_PATHS } from "../../config/api";
import MarkdownEditor from "../../components/MarkdownEditor";
import {
  getRequestErrorMessage,
  isFormValidationError,
} from "../../utils/requestError";

type BlogCreateFormValues = {
  title: string;
  content: string;
  summary: string;
  coverImage: string;
  category?: string;
  tags?: string;
};

type BlogEditState = {
  blog?: {
    id?: number;
    title?: string;
    content?: string;
    summary?: string;
    cover_image?: string;
    coverImage?: string;
    category?: string;
    tags?: string;
  };
};

export const BlogCreatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { blogId } = useParams<{ blogId: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<BlogCreateFormValues>();
  const coverPreview = String(Form.useWatch("coverImage", form) ?? "").trim();
  const editingBlogId = useMemo(() => {
    const id = Number(blogId);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }, [blogId]);
  const isEditMode = editingBlogId > 0;

  useEffect(() => {
    if (!isEditMode) {
      form.resetFields();
      return;
    }
    const state = (location.state ?? {}) as BlogEditState;
    const blog = state.blog;
    if (!blog || Number(blog.id) !== editingBlogId) {
      messageApi.warning("未找到可编辑的文章数据，请从列表页进入编辑");
      navigate("/content/blogs", { replace: true });
      return;
    }
    form.setFieldsValue({
      title: blog.title ?? "",
      content: blog.content ?? "",
      summary: blog.summary ?? "",
      coverImage: blog.cover_image ?? blog.coverImage ?? "",
      category: blog.category ?? "",
      tags: blog.tags ?? "",
    });
  }, [editingBlogId, form, isEditMode, location.state, messageApi, navigate]);

  const submitBlog = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        title: values.title,
        content: values.content,
        summary: values.summary,
        cover_image: values.coverImage,
        category: values.category ?? "",
        tags: values.tags ?? "",
      };
      if (isEditMode) {
        await http.post(
          `${API_PATHS.blogUpdate}/${encodeURIComponent(String(editingBlogId))}`,
          payload
        );
        messageApi.success("编辑文章成功");
      } else {
        await http.post(API_PATHS.blogCreate, payload);
        messageApi.success("新增文章成功");
      }
      navigate("/content/blogs", { replace: true });
    } catch (err) {
      if (isFormValidationError(err)) return;
      messageApi.error(
        getRequestErrorMessage(err, isEditMode ? "编辑文章失败" : "新增文章失败")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate("/content/blogs")}>返回列表</Button>
        <Button type="primary" loading={submitting} onClick={submitBlog}>
          {isEditMode ? "保存修改" : "提交文章"}
        </Button>
      </Space>

      <Form<BlogCreateFormValues> form={form} layout="vertical">
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
          <Input placeholder="请输入封面 URL" maxLength={255} allowClear />
        </Form.Item>
        {coverPreview ? (
          <Form.Item label="封面预览">
            <AntdImage
              src={coverPreview}
              alt="封面预览"
              width={240}
              style={{ borderRadius: 8, objectFit: "cover" }}
            />
          </Form.Item>
        ) : null}
        <Form.Item label="分类" name="category" rules={[{ max: 255, message: "分类最多 255 字" }]}>
          <Input placeholder="例如：后端开发" maxLength={255} />
        </Form.Item>
        <Form.Item label="标签" name="tags" rules={[{ max: 255, message: "标签最多 255 字" }]}>
          <Input placeholder="多个标签请使用英文逗号(,)分割" maxLength={255} />
        </Form.Item>
        <Form.Item
          label="正文"
          name="content"
          rules={[
            { required: true, message: "请输入正文内容" },
            { max: 20000, message: "正文最多 20000 字" },
          ]}
        >
          <MarkdownEditor />
        </Form.Item>
      </Form>
    </>
  );
};

export default BlogCreatePage;
