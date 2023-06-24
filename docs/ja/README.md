# ![logo](../slideshow.png ':size=64') <span style="font-family:impact;">Frameless Slideshow</span>

## 概要

無料でオープンソースのWindows用スライドショーアプリケーション。枠無しウィンドウ、フィルタ効果や画像の重ね合わせなど、さまざまな楽しい機能を搭載しています。

![](../../screenshot-002.png ':size=200')
![](../../screenshot-003.png ':size=200')

### 特徴

- 枠無しウィンドウ
- 背景の透過(疑似)
- 画像の重ね合わせ
- 柔軟なポジショニング
- 額縁の貼り付け
- シェイプ
- トランジション効果
- フィルター効果

### システム要件

Windows **XP** 以上

## ダウンロードとインストール

1. <span style="color:blue">[ここ]({{zip}})</span>からzipファイルをダウンロード
1. 任意のフォルダへ解凍
1. フォルダを開き `frameless-slideshow.hta` を実行

![icon](../htaicon.png)

## 使い方
### 簡単な使用法

#### 1. フレームを作成
開始メニューから "フレームを作成" をクリックして下さい。新しいスライドショーが開きます。

![](../usage-001.png ':size=300')

#### 2. 画像ファイルを追加

"画像ファイルを追加" または "画像フォルダを追加" をクリックし、画像かフォルダを選択して下さい。或いは直接ウィンドウにドラッグ&ドロップできます(一度に1ファイルのみ受け付けます)。

![](../usage-002.png ':size=300')

#### 3. スライドショーを再生

複数の画像が追加されるとスライドショーは自動的に開始されます。カーソルを合わせると表示されるオーバーレイボタンで操作可能です。

![](../usage-003.png ':size=300')

#### 4. スライドショーのカスタマイズ

スライドショーは移動やリサイズができます。別のフレームを追加する場合はウィンドウを右クリックしてコンテキストメニューを開き、"新しいフレーム" -> "新しいフレームを追加" を選択して下さい。このメニューからは様々な設定項目が利用できます。

![](../usage-004.png ':size=300')

#### 5. 保存と終了

メニューの "終了" をクリックすると、スライドショーを保存するかどうかを尋ねられます。セーブしたファイルは次回から開始メニューからロードする事ができます。このアプリのセーブファイルの拡張子は ".flss" です。

![](../usage-005.png ':size=300')



### 高度な使用法

#### 額縁の貼り付け方

このアプリケーションは "Frameless(縁無し)" と名付けられてはいますが, その楽しい機能の一つに "Picture Frame(額縁)" があります。

**シンプルな四角形の額縁の場合**

まず最初に、透過GIFか透過PNGの額縁画像を用意して下さい。

![](../Antique-Frame-Transparent-Images-PNG.png ':size=80')

1: 額縁を取り付ける対象のスライドショーを作成します。再生されている場合は停止して下さい。

![](../picframe-rect-000.png ':size=300')

2: フレームを右クリックし、メニューから "表示" -> "画像: フレーム全体を埋める" を選択。

![](../picframe-rect-001.png ':size=300')

3: 別のフレームを作成し額縁画像をロードします。

![](../picframe-rect-002.png ':size=300')

4: 画像が額縁の中に収まるようにそれぞれのフレームをリサイズして下さい。

![](../picframe-rect-003.png ':size=200')
![](../picframe-rect-004.png ':size=200')

5: **額縁のフレーム**を右クリックし、"フレーム設定" -> "このフレームを額縁として貼り付け" をメニューから選択。

![](../picframe-rect-005.png ':size=300')

6: 完了。額縁はスライドショーに貼り付きました。取り除く場合は "フレーム設定" -> "額縁を取り外す" を選択します。

![](../picframe-rect-006.png ':size=300')


**様々な形状の額縁の場合**

四角形ではない額縁を使用する場合は、同じ形状のシェイプデータが必要です。このアプリケーションにおける "シェイプデータ" とは、透過色付きのGIFかPNG画像の事です。画像の不透明部分が形状として利用されます。このアプリには "Circle" シェイプがデフォルトで用意されているので、ここでは円形の額縁を例にして説明します。

![](../Floral-Round-Frame-PNG-Transparent-Picture.png ':size=80')

1: 上記のステップ 1 - 3 を実行。

![](../picframe-round-000.png ':size=200')

2: スライドショーを右クリックし、"画像設定" -> "シェイプ" -> "Circle" を選択。

![](../picframe-round-001.png ':size=200')
![](../picframe-round-002.png ':size=200')

3: 上記のステップ 4, 5 を実行

![](../picframe-round-003.png ':size=200')
![](../picframe-round-005.png ':size=200')

4: 完成!

![](../picframe-round-006.png)

#### その他の詳細

作業中




## [Notes](../?id=notes)




## クレジット

### Repository
[GitHub](https://github.com/gitcobra/frameless-slideshow)

### Resources

* ![logo](../slideshow.png ':size=16')<a href="https://www.flaticon.com/free-icons/slideshow" title="slideshow icons">Slideshow icons created by Freepik - Flaticon</a>

### License

MIT License
