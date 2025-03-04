# Mermaid Converter アプリ (セットアップ手順)

下記の手順でMermaid Converterアプリをセットアップできます。

## ファイル構成

アプリは以下のファイルで構成されています:

1. `package.json` - 依存関係と設定
2. `main.js` - Electronのメイン処理
3. `preload.js` - プリロード処理
4. `index.html` - メインUI
5. `renderer.js` - UI操作のためのスクリプト
6. `styles.css` - UIスタイル
7. `README.md` - 説明書
8. `sample.mmd` - サンプルMermaidファイル

## セットアップ手順

1. 以下のリンクからZIPファイルをダウンロードしてください:
   [Mermaid-Converter.zip](https://drive.google.com/file/d/1S4NnpJBwE0YdF2-8-RdzwgDx9RQWa8gq/view?usp=sharing)

2. ダウンロードしたZIPファイルを展開します

3. ターミナルで展開したディレクトリに移動します:
   ```bash
   cd path/to/mermaid-converter
   ```

4. 依存関係をインストールします:
   ```bash
   npm install
   ```

5. アプリを起動します:
   ```bash
   npm start
   ```

## ビルド方法

Mac版アプリをビルドする場合:
```bash
npm run build:mac
```

Windows版アプリをビルドする場合:
```bash
npm run build:win
```

両方のプラットフォーム向けにビルドする場合:
```bash
npm run build
```

ビルドされたアプリは `dist` ディレクトリに生成されます。

## 注意事項

- Node.js と npm が事前にインストールされている必要があります
- @mermaid-js/mermaid-cli はインストール時に自動的にダウンロードされます