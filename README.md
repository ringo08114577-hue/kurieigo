# クリエイゴ (Creigeo)

30秒で、配られた8種類のアルファベットから英単語を作るブラウザゲームです。

## ゲームルール
- 30秒のラウンド制。
- 母音 A/E/I/O/U から重複なしで2文字、子音から重複なしで6文字を選び、合計8文字をシャッフルして配ります。
- 単語に使えるのは配られた8種類の文字だけです。単語内では同じ文字を何回使っても構いません。
- 3文字=1点、4文字=3点、5文字=5点、6文字=7点、7文字=9点、8文字=11点。9文字以上は1文字増えるごとに2点追加。
- 同じ単語は1ラウンドで1回しか得点になりません。
- 辞書にある3文字以上の単語だけ有効です。

## ファイル
- `index.html`: ゲーム画面
- `style.css`: デザイン・スマホ対応
- `game.js`: 文字配布、タイマー、判定、得点、最高記録の保存
- `dictionary.txt`: 英単語辞書（約86,634語）
- `DICTIONARY-LICENSE.txt`: 辞書データの出典とライセンス表記

## 辞書
辞書は `neopass/wordlist` の `default.txt` をもとに、重複を除き、3文字以上の英小文字だけを抽出しています。収録語には一般的な単語のほか、活用形や珍しい語も含まれます。辞書に載っていることは、日常的によく使う単語であることを保証するものではありません。

## GitHub Pages
リポジトリの Settings → Pages で、Source を「Deploy from a branch」、Branch を `main`、Folder を `/(root)` にすると公開できます。

## Credits
Word list source: https://github.com/neopass/wordlist
SCOWL: https://wordlist.aspell.net/
