import en from "./en";

const ja: Partial<typeof en> = {
  'ja': '日本語',

  'new-frame': '新規フレーム',
  'open-new-window': '新しいウィンドウを開く',
  "add-newframe": '新しいフレームを追加',
  'pin-frame': 'フレームを固定',
  'unpin-frame': 'フレームの固定を解除',
  'pin-window': 'ウィンドウ全体を固定',
  'unpin-window': 'ウィンドウの固定を解除',

  'edit-playlist': 'プレイリストを編集',
  'start-slide': 'スライドショーを開始',
  'stop-slide': 'スライドショーを停止',
  'playlist': 'プレイリスト',
  'clear-playlist': 'プレイリストを消去',
  "add-image": '画像を追加',
  'add-folder': 'フォルダを追加',
  "shuffle-list": 'リストをシャッフル',
  
  "slideshow": 'スライドショー',
  "transition": 'トランジション',
  'slide-delay': 'スライド間隔',
  
  "cut-frame": 'フレームを切り取り',
  "copy-frame": 'フレームをコピー',
  "paste-frame": 'フレームを貼り付け',
  "close-frame": 'フレームを削除',
  
  
  'view': '表示',
  'frame-position': '基準フレーム位置',
  'image-position': '基準画像位置',

  "frameview.fixed": 'フレーム: 固定サイズ',
  "frameview.stretch": 'フレーム: 画像サイズ',
  "frameview.mix": 'フレーム: 順応サイズ',
  "image-scale": '表示倍率',
  "imageview.none": '画像: 指定倍率で表示',
  "imageview.longer": '画像: フレーム内に収める',
  "imageview.shorter": '画像: フレーム全体を埋める',
  "imageview.width": '画像: 幅に合わせる',
  "imageview.height": '画像: 高さに合わせる',
  "imageview.expand": '小さい画像を拡大',

  "frame-settings": 'フレーム設定',
  'set-picframe': 'このフレームを額縁として貼り付け',
  'remove-picframe': '額縁を取り外す',
  "frame-set-as-default": 'このフレームの設定を規定にする',

  "image-settings": '画像設定',
  "image-quality": '画質',

  'arrange-frames': 'フレームを整理',
  'file-management': 'ファイル操作',
  'file-open': '関連付けで開く',

  'languages': '言語',
  'settings': '設定',

  'create-startup': 'スタートアップ作成',
  'create-shortcut': 'ショートカット作成',
  'reload': 'リロード',
  
  'save-as': '名前を付けて保存',
  'exit': '終了',

  "confirm-save-beforeclose": '終了する前にこのスライドショーを保存しますか？',
  "confirm-nosave-exiting": '本当に保存せずに終了しますか？',
  "confirm-save-before-createshortcut": 'このスライドショーはまだ保存されていません。\nショートカットを作成する前にまず保存して下さい。',
  'confirm-file-overwrite': '$1 は既に存在します。 上書きしますか？',

  'message-leaked-memory-exceeded': '算出したメモリ使用量が制限値を超えました。 ($1 MB)',
  'message-ask-save-and-restart': '現在のスライドショーを保存し、アプリケーションをリスタートして下さい。保存後はこのリスタート処理は自動的に実行されます。',
  'message-restarting': 'アプリケーションは $1 秒後にリスタートします。',

  'startmenu-create-frame': 'フレームを作成',
  'startmenu-create-window': '新しいウインドウを開く',
  'startmenu-load-data': 'セーブデータを読込',
  'startmenu-quit': '終了',
  'startmenu-element-open-image': '画像ファイルを追加',
  'startmenu-element-open-folder': '画像フォルダを追加',
  'startmenu-element-remove': '削除',
};

export default ja;
