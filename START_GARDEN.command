#!/bin/sh
set -eu
cd "$(dirname "$0")"

preview_url='http://127.0.0.1:4198/#garden'
if curl --fail --silent --max-time 2 http://127.0.0.1:4198/ >/dev/null 2>&1; then
  echo "花园预览已在运行，请打开：$preview_url"
  exit 0
fi

if [ ! -f dist/index.html ]; then
  echo '尚未生成预览文件。请先在项目目录运行：sh scripts/project.sh build'
  exit 1
fi

echo "花园预览：$preview_url"
echo '请保持这个终端窗口打开；关闭窗口或重启电脑后，需要重新双击此文件。'
exec /bin/sh scripts/project.sh preview --port 4198
