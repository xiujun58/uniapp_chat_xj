<template>
  <view class="page">
    <view class="status-bar"></view>

    <view class="header">
      <view class="title-row">
        <text class="title">消息</text>
        <text class="subtitle" @click="clearUnread">清除未读</text>
      </view>
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          type="text"
          v-model="keyword"
          placeholder="搜索聊天记录/联系人"
          placeholder-class="placeholder"
        />
      </view>
    </view>

    <scroll-view class="chat-list" scroll-y>
      <view
        class="chat-item"
        v-for="item in filteredList"
        :key="item.id"
        @click="goChat(item)"
      >
        <view class="avatar">{{ item.name.slice(-1) }}</view>
        <view class="item-center">
          <view class="name">{{ item.name }}</view>
          <view class="preview">{{ item.lastMsg }}</view>
        </view>
        <view class="item-right">
          <text class="time">{{ item.time }}</text>
          <view class="unread" v-if="item.unread > 0">{{ item.unread }}</view>
        </view>
      </view>
    </scroll-view>

    <view class="tabbar">
      <view class="tab-item">首页</view>
      <view class="tab-item">专员</view>
      <view class="tab-add">+</view>
      <view class="tab-item active">消息</view>
      <view class="tab-item">我的</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      keyword: '',
      currentRoomId: '',
      chats: [
        { id: 1, roomId: '云浮石材严选', name: '云浮石材严选', lastMsg: '您好，请问你有什么需要的吗？', time: '11:01', unread: 0, online: true },
        { id: 2, roomId: '云浮石材加工-小李', name: '云浮石材加工-小李', lastMsg: '报价单已经发您了', time: '11:00', unread: 2, online: true },
        { id: 3, roomId: '佛山石材批发-小王', name: '佛山石材批发-小王', lastMsg: '期待与您合作', time: '03/29', unread: 0, online: false },
        { id: 4, roomId: '广州石材城-阿明', name: '广州石材城-阿明', lastMsg: '样品明天可以到', time: '03/21', unread: 0, online: false },
        { id: 5, roomId: '广州装修公司-小张', name: '广州装修公司-小张', lastMsg: '收到，稍后回复您', time: '02/10', unread: 0, online: false }
      ]
    };
  },
  computed: {
    filteredList() {
      if (!this.keyword) return this.chats;
      return this.chats.filter((i) => i.name.includes(this.keyword) || i.lastMsg.includes(this.keyword));
    }
  },
  onLoad() {
    uni.$on('chat:last-message', this.updateChatItem);
  },
  onUnload() {
    uni.$off('chat:last-message', this.updateChatItem);
  },
  methods: {
    goChat(item) {
      this.currentRoomId = item.roomId;
      item.unread = 0;
      uni.navigateTo({
        url: `/pages/chat/detail?name=${encodeURIComponent(item.name)}&online=${item.online ? 1 : 0}&roomId=${encodeURIComponent(item.roomId)}`
      });
    },
    clearUnread() {
      this.chats = this.chats.map((chat) => ({ ...chat, unread: 0 }));
    },
    updateChatItem(payload) {
      if (!payload?.roomId) return;
      const index = this.chats.findIndex((chat) => chat.roomId === payload.roomId);
      const unreadInc = payload.roomId === this.currentRoomId ? 0 : Number(payload.unreadInc || 0);

      if (index === -1) {
        this.chats.unshift({
          id: Date.now(),
          roomId: payload.roomId,
          name: payload.name || payload.roomId,
          lastMsg: payload.lastMsg || '[新消息]',
          time: payload.time || '--:--',
          unread: unreadInc,
          online: true
        });
      } else {
        const old = this.chats[index];
        const next = {
          ...old,
          lastMsg: payload.lastMsg || old.lastMsg,
          time: payload.time || old.time,
          unread: (old.unread || 0) + unreadInc
        };
        this.chats.splice(index, 1);
        this.chats.unshift(next);
      }
    }
  }
};
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.status-bar {
  height: var(--status-bar-height);
}
.header {
  padding: 24rpx;
}
.title-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 18rpx;
}
.title {
  font-size: 46rpx;
  font-weight: 700;
}
.subtitle {
  font-size: 24rpx;
  color: #98a3bf;
  margin-left: 16rpx;
}
.search-box {
  background: #e7edf9;
  border-radius: 32rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
}
.search-icon {
  margin-right: 12rpx;
  opacity: 0.55;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
}
.placeholder {
  color: #a8b2ca;
}
.chat-list {
  flex: 1;
  padding: 0 16rpx;
}
.chat-item {
  display: flex;
  align-items: center;
  padding: 18rpx 10rpx;
  border-bottom: 1px solid rgba(157, 171, 199, 0.2);
}
.avatar {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #cad6f5, #a6bddf);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}
.item-center {
  margin-left: 16rpx;
  flex: 1;
}
.name {
  font-size: 32rpx;
  color: #2f3d5e;
}
.preview {
  margin-top: 6rpx;
  color: #8490ab;
  font-size: 26rpx;
}
.item-right {
  text-align: right;
  min-width: 96rpx;
}
.time {
  color: #8f9ab5;
  font-size: 22rpx;
}
.unread {
  margin-top: 8rpx;
  margin-left: auto;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #fa4d48;
  color: #fff;
  font-size: 22rpx;
  line-height: 32rpx;
  text-align: center;
  padding: 0 8rpx;
}
.tabbar {
  height: 104rpx;
  background: #dfe8f9;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
}
.tab-item {
  color: #5d6a87;
  font-size: 24rpx;
}
.tab-item.active {
  font-weight: 700;
}
.tab-add {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  background: #3c82ef;
  color: #fff;
  font-size: 50rpx;
  line-height: 68rpx;
  text-align: center;
}
</style>
