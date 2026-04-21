import { Result } from "antd";

const NoAccessPage = () => {
  return (
    <Result
      status="403"
      title="无访问权限"
      subTitle="当前账号没有任何可访问菜单，或无权进入该页面，请联系管理员分配权限。"
    />
  );
};

export default NoAccessPage;
