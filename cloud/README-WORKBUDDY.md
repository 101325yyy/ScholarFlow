# WorkBuddy 云数据库已在服务器创建，无需执行 SQL

本目录中遗留的 `schema.sql` 是 Supabase 历史实现的留档，不适合当前 WorkBuddy Cloud 的 `owner_id text default auth.uid()` 契约。**请勿在 WorkBuddy 后台执行此旧 SQL。**

当前前端只调用已存在的 `scholarflow_snapshots` 表和私有用户文件路径；表的 RLS 配置由 WorkBuddy 云管理员管理。客户端不传 owner_id。
