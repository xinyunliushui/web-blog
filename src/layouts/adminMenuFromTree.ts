import React, { type ReactNode } from "react";
import type { MenuProps } from "antd";
import * as IconComponents from "@ant-design/icons";
import type { AccessMenuNode } from "../types/menu";

export type AntMenuItem = NonNullable<MenuProps["items"]>[number];

/** 后端 path 可为分段（如 system、users）或绝对路径；与父级 fullPath 拼接成前端路由 */
export function joinMenuFullPath(
  parentFullPath: string,
  segment: string
): string {
  const s = (segment || "").trim();
  if (!s) {
    const p = parentFullPath.replace(/\/+$/, "");
    return p ? p : "/";
  }
  if (s.startsWith("/")) {
    return "/" + s.replace(/^\/+/g, "").replace(/\/+$/g, "");
  }
  const base = (parentFullPath || "").replace(/\/+$/, "");
  const norm = s.replace(/^\/+/g, "").replace(/\/+$/g, "");
  if (!base) return `/${norm}`;
  return `${base}/${norm}`.replace(/\/+/g, "/");
}

/** 与 initAdmin 中 icon 字段一致：Ant Design Icons 组件名，如 SettingOutlined */
export function menuIconNode(iconName?: string | null): ReactNode {
  if (!iconName || !String(iconName).trim()) return undefined;
  const name = String(iconName).trim();
  const Cmp = (IconComponents as any)[name];
  return React.createElement(Cmp ?? IconComponents.MenuOutlined);
}

function isMenuVisible(node: AccessMenuNode): boolean {
  return node.status === 1 && node.hidden !== 1;
}

function sortedVisibleChildren(
  nodes: AccessMenuNode[] | undefined
): AccessMenuNode[] {
  if (!nodes?.length) return [];
  return [...nodes].filter(isMenuVisible).sort((a, b) => a.sort - b.sort);
}

function leafLinkTarget(
  node: AccessMenuNode,
  fullPath: string,
  parentFullPath: string
): string {
  const r = node.redirect?.trim();
  if (!r) return fullPath;
  if (r.startsWith("/")) return r;
  return joinMenuFullPath(parentFullPath, r);
}

/**
 * 将接口菜单树转为 Ant Design Menu `items`。
 * - 有子节点：key 为当前 fullPath，label 为 title（纯文本，可展开）
 * - 叶子：key 为实际跳转路径（与 React Router 一致），label 为 Link
 */
export function accessMenuNodesToAntdItems(
  nodes: AccessMenuNode[],
  parentFullPath: string,
  linkRenderer: (to: string, title: string) => ReactNode
): AntMenuItem[] {
  return sortedVisibleChildren(nodes).map((node) => {
    const fullPath = joinMenuFullPath(parentFullPath, node.path);
    const title = node.title || node.name || fullPath;
    const icon = menuIconNode(node.icon);
    const rawKids = node.children;
    const childItems =
      rawKids && rawKids.length > 0
        ? accessMenuNodesToAntdItems(rawKids, fullPath, linkRenderer)
        : [];

    if (childItems.length > 0) {
      return {
        key: fullPath,
        icon,
        label: title,
        children: childItems,
      };
    }

    const to = leafLinkTarget(node, fullPath, parentFullPath);
    return {
      key: to,
      icon,
      label: linkRenderer(to, title),
    };
  });
}

/** 当前路径下需展开的父级菜单 key（与 items 里父级 key 一致，即父节点的 fullPath） */
export function openKeysForSelectedPath(
  items: AntMenuItem[] | undefined,
  pathname: string
): string[] {
  const keys: string[] = [];

  const walk = (nodes: AntMenuItem[], ancestors: string[]): void => {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const key = String((node as { key?: unknown }).key ?? "");
      const children = (node as { children?: AntMenuItem[] }).children;
      if (children?.length) {
        walk(children, [...ancestors, key]);
      } else if (pathname === key) {
        keys.push(...ancestors);
      }
    }
  };

  if (items?.length) {
    walk(items as AntMenuItem[], []);
  }
  return keys;
}
