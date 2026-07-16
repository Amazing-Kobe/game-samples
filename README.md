# オリジナルゲーム サンプル集

企業向けに制作したブラウザ用オリジナルミニゲームのサンプル集です。
各ゲームは追加のインストール不要で、ブラウザ上でそのまま動作します。

## 公開ページ（GitHub Pages）

リポジトリの Settings → Pages で公開すると、以下のような URL で閲覧できます:

```
https://<あなたのGitHubユーザー名>.github.io/game-samples/
```

トップページから各社のゲームへリンクしています。

## 収録ゲーム

| フォルダ | 企業 | 内容 |
|---|---|---|
| `games/kobe-hikey-energy/` | KOBE Hikey Energy | ハイキー・ゲームパーク（3種） |
| `games/amazing/` | 株式会社Amazing | AMAZING ゲームラボ（3種） |
| `games/shikoku-namacon/` | 四国生コンクリート工業 | 四国生コン GAMES（3種） |
| `games/japan-reef/` | 日本リーフグループ | うみのゲームパーク（3種） |
| `games/kovec/` | 株式会社コベック | コベック エコ・ゲームパーク（3種） |
| `games/fujieda-5axis/` | 藤枝鉄工 | FUJIEDA 5AXIS GAME LAB |

## フォルダ構成

```
game-samples/
├── index.html          … トップページ（全ゲームへのリンク）
├── README.md
└── games/
    ├── kobe-hikey-energy/   （index.html + assets/）
    ├── amazing/
    ├── shikoku-namacon/
    ├── japan-reef/
    ├── kovec/
    └── fujieda-5axis/
```

各ゲームフォルダは独立して動作します。新しいゲームを追加する場合は、
`games/` の下に半角英数字の名前でフォルダを作り、トップページ `index.html` にカードを追加してください。

## ローカルでの確認方法

フォルダ内で簡易サーバーを立ち上げるとブラウザで確認できます:

```bash
cd game-samples
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```
