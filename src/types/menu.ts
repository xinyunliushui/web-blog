/**
 * 与 go-blog model.Menu / GET /menu/access/tree/:userId 返回的树节点字段对齐
 */
export interface AccessMenuNode {
  id: string;
  name: string;
  title: string;
  icon?: string | null;
  path: string;
  redirect?: string | null;
  sort: number;
  /** 1 正常 */
  status: number;
  /** 1 隐藏，2 显示 */
  hidden: number;
  children?: AccessMenuNode[];
}
