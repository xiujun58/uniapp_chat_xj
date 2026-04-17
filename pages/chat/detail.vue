<template>
  <view class="page">
    <view class="status-bar"></view>
    <view class="top-bar">
      <text class="back" @click="back">‹</text>
      <view class="title-wrap">
        <text class="name">{{ chatName }}</text>
        <text class="online" :class="{ off: !isOnline }">{{ isOnline ? '在线' : '离线' }}</text>
        <text class="conn-state" :class="socketState">{{ socketStateText }}</text>
      </view>
      <view class="actions">•••</view>
    </view>

    <scroll-view class="messages" scroll-y :scroll-into-view="scrollToId">
      <view class="time-tip">{{ todayTime }}</view>
      <view
        v-for="msg in messageList"
        :key="msg.id"
        :id="`m-${msg.id}`"
        class="msg-row"
        :class="msg.from"
      >
        <view class="avatar">{{ msg.from === 'me' ? '我' : '客' }}</view>
        <view>
          <view class="bubble" :class="[msg.type === 'order' ? 'order' : '', msg.from]">
            <template v-if="msg.type === 'text'">{{ msg.content }}</template>
            <template v-else-if="msg.type === 'order'">
              <view class="order-title">{{ msg.content.title }}</view>
              <view class="order-line" v-for="(line, idx) in msg.content.lines" :key="idx">{{ line }}</view>
            </template>
            <template v-else>
              <text>{{ msg.content }}</text>
            </template>
          </view>
          <text class="read" v-if="msg.from === 'me'">{{ msg.read ? '已读' : '发送中' }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="composer">
      <view class="input-row">
        <input
          class="input"
          v-model="draft"
          placeholder="想跟TA说点什么..."
          placeholder-class="placeholder"
          @confirm="sendText"
        />
        <view class="icon-btn" @click="togglePanel">＋</view>
        <view class="icon-btn" @click="sendText">➤</view>
      </view>

      <view class="plus-panel" v-if="showPanel">
        <view class="tool" @click="pickImage(false)">
          <view class="tool-icon">🖼️</view>
          <text>相册</text>
        </view>
        <view class="tool" @click="pickImage(true)">
          <view class="tool-icon">📷</view>
          <text>拍摄</text>
        </view>
        <view class="tool" @click="pickFile">
          <view class="tool-icon">📁</view>
          <text>文件</text>
        </view>
        <view class="tool" @click="pickVideo">
          <view class="tool-icon">🎬</view>
          <text>视频</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { WS_BASE_URL } from '../../config/chat';
import { getChatSocket } from '../../utils/chatSocket';

let idSeed = 100;

export default {
  data() {
    return {
      chatName: '云浮石材严选',
      isOnline: true,
      draft: '',
      showPanel: false,
      scrollToId: '',
      roomId: '',
      socketState: 'connecting',
      socketStateText: '连接中',
      socket: null,
      unsubscribeSocket: null,
      todayTime: '',
      messageList: [
        { id: 1, from: 'me', type: 'text', content: '您好，请问你有什么需要的吗？', read: true },
        { id: 2, from: 'other', type: 'text', content: '没有什么需要的', read: true }
      ]
    };
  },
  onLoad(query) {
    if (query.name) this.chatName = decodeURIComponent(query.name);
    this.roomId = query.roomId || this.chatName;
    this.isOnline = Number(query.online || 1) === 1;
    this.todayTime = this.formatClock(new Date());
    this.connectSocket();
    this.scrollBottom();
  },
  onUnload() {
    if (this.unsubscribeSocket) {
      this.unsubscribeSocket();
      this.unsubscribeSocket = null;
    }
  },
  methods: {
    back() {
      uni.navigateBack();
    },
    nextId() {
      idSeed += 1;
      return idSeed;
    },
    connectSocket() {
      const socketUrl = `${WS_BASE_URL}?roomId=${encodeURIComponent(this.roomId)}&userId=buyer001`;
      this.socket = getChatSocket(socketUrl);
      this.unsubscribeSocket = this.socket.subscribe(this.onSocketMessage);
      this.socket.connect();
      this.syncSocketStatus();
    },
    syncSocketStatus() {
      const timer = setInterval(() => {
        if (!this.socket) return;
        if (this.socket.connected) {
          this.socketState = 'online';
          this.socketStateText = '已连接';
        } else if (this.socket.connecting) {
          this.socketState = 'connecting';
          this.socketStateText = '连接中';
        } else {
          this.socketState = 'offline';
          this.socketStateText = '重连中';
        }
      }, 500);
      this.$once('hook:onUnload', () => clearInterval(timer));
    },
    sendText() {
      const text = (this.draft || '').trim();
      if (!text) return;
      const id = this.nextId();
      this.pushLocalMessage({ id, from: 'me', type: 'text', content: text, read: false });
      this.sendSocketMessage({
        msgId: id,
        roomId: this.roomId,
        type: 'text',
        content: text,
        from: 'me',
        to: this.chatName,
        ts: Date.now()
      });
      this.draft = '';
      this.showPanel = false;
    },
    togglePanel() {
      this.showPanel = !this.showPanel;
      this.scrollBottom();
    },
    pickImage(useCamera) {
      uni.chooseImage({
        count: 1,
        sourceType: useCamera ? ['camera'] : ['album'],
        success: (res) => {
          const filePath = res.tempFilePaths[0];
          this.sendAssetMessage('image', `${useCamera ? '拍摄' : '图片'}: ${filePath.split('/').pop()}`);
        }
      });
    },
    pickFile() {
      // #ifdef H5
      this.sendAssetMessage('file', '文件: 当前平台请接入文件上传SDK');
      // #endif

      // #ifndef H5
      uni.chooseMessageFile({
        count: 1,
        type: 'file',
        success: (res) => {
          const name = res.tempFiles?.[0]?.name || '未命名文件';
          this.sendAssetMessage('file', `文件: ${name}`);
        }
      });
      // #endif
    },
    pickVideo() {
      uni.chooseVideo({
        sourceType: ['album', 'camera'],
        success: (res) => {
          const name = res.tempFilePath?.split('/').pop() || '视频文件';
          this.sendAssetMessage('video', `视频: ${name}`);
        }
      });
    },
    sendAssetMessage(kind, content) {
      const id = this.nextId();
      this.pushLocalMessage({ id, from: 'me', type: 'asset', content, read: false });
      this.sendSocketMessage({
        msgId: id,
        roomId: this.roomId,
        type: kind,
        content,
        from: 'me',
        to: this.chatName,
        ts: Date.now()
      });
      this.showPanel = false;
    },
    sendSocketMessage(payload) {
      if (!this.socket) return;
      this.socket.send(payload);
      uni.$emit('chat:last-message', {
        roomId: this.roomId,
        name: this.chatName,
        lastMsg: payload.content,
        time: this.formatClock(new Date(payload.ts)),
        unreadInc: 0
      });
      this.scrollBottom();
    },
    onSocketMessage(payload) {
      if (!payload || payload.type === 'ping') return;

      if (payload.from === 'me') {
        const idx = this.messageList.findIndex((msg) => msg.id === payload.msgId);
        if (idx > -1) this.$set(this.messageList[idx], 'read', true);
        return;
      }

      const content = payload.content || '[新消息]';
      this.pushLocalMessage({
        id: payload.msgId || this.nextId(),
        from: 'other',
        type: payload.type === 'order' ? 'order' : 'text',
        content,
        read: true
      });

      uni.$emit('chat:last-message', {
        roomId: this.roomId,
        name: this.chatName,
        lastMsg: typeof content === 'string' ? content : '[订单消息]',
        time: this.formatClock(new Date(payload.ts || Date.now())),
        unreadInc: 1
      });
    },
    pushLocalMessage(msg) {
      this.messageList.push(msg);
      this.scrollBottom();
    },
    scrollBottom() {
      this.$nextTick(() => {
        const last = this.messageList[this.messageList.length - 1];
        if (last) {
          this.scrollToId = `m-${last.id}`;
        }
      });
    },
    formatClock(date) {
      const h = `${date.getHours()}`.padStart(2, '0');
      const m = `${date.getMinutes()}`.padStart(2, '0');
      return `${h}:${m}`;
    }
  }
};
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #e9f0ff;
}
.status-bar {
  height: var(--status-bar-height);
}
.top-bar {
  height: 88rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(140, 154, 183, 0.25);
}
.back {
  width: 44rpx;
  font-size: 52rpx;
  color: #3d4a68;
}
.title-wrap {
  flex: 1;
  display: flex;
  align-items: baseline;
  margin-left: 14rpx;
  gap: 12rpx;
}
.name {
  font-size: 34rpx;
  font-weight: 600;
  color: #2f3d5b;
}
.online {
  color: #1fcb72;
  font-size: 24rpx;
}
.online.off {
  color: #95a2bd;
}
.conn-state {
  font-size: 22rpx;
  color: #8a99b8;
}
.conn-state.online {
  color: #1fcb72;
}
.conn-state.offline {
  color: #ff8f3c;
}
.actions {
  width: 80rpx;
  height: 48rpx;
  border-radius: 24rpx;
  border: 1px solid #c6d2ed;
  text-align: center;
  line-height: 44rpx;
  color: #4f5f83;
}
.messages {
  flex: 1;
  padding: 24rpx;
}
.time-tip {
  text-align: center;
  color: #adb9d0;
  font-size: 24rpx;
  margin-bottom: 18rpx;
}
.msg-row {
  display: flex;
  margin-bottom: 18rpx;
}
.msg-row.me {
  flex-direction: row-reverse;
}
.avatar {
  width: 58rpx;
  height: 58rpx;
  border-radius: 50%;
  background: #c6d6f8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12rpx;
}
.bubble {
  max-width: 470rpx;
  padding: 18rpx 22rpx;
  border-radius: 24rpx;
  font-size: 30rpx;
  line-height: 1.45;
}
.bubble.me {
  background: #3f83ea;
  color: #fff;
}
.bubble.other {
  background: #dfe7f8;
  color: #32415f;
}
.bubble.order {
  min-width: 420rpx;
}
.order-title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 14rpx;
  padding-bottom: 14rpx;
  border-bottom: 1px dashed rgba(255, 228, 110, 0.7);
}
.order-line {
  font-size: 29rpx;
  margin-top: 8rpx;
}
.read {
  display: block;
  font-size: 22rpx;
  color: #9ca8c5;
  margin-top: 6rpx;
  text-align: right;
}
.composer {
  background: #e2eaf9;
  padding: 14rpx 16rpx calc(14rpx + env(safe-area-inset-bottom));
}
.input-row {
  display: flex;
  align-items: center;
}
.input {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  background: #dce5f8;
  padding: 0 22rpx;
  font-size: 28rpx;
}
.placeholder {
  color: #aab5cd;
}
.icon-btn {
  width: 58rpx;
  height: 58rpx;
  margin-left: 12rpx;
  border-radius: 12rpx;
  border: 1px dashed #9ba9c4;
  text-align: center;
  line-height: 56rpx;
  color: #5a6a8a;
  font-size: 36rpx;
}
.plus-panel {
  margin-top: 18rpx;
  display: flex;
  justify-content: space-around;
}
.tool {
  text-align: center;
  color: #3c4c6e;
  font-size: 24rpx;
}
.tool-icon {
  width: 82rpx;
  height: 82rpx;
  border-radius: 18rpx;
  background: #d3dff6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  margin-bottom: 8rpx;
}
</style>
