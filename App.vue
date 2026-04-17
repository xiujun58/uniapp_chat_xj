<template>
  <view class="app-container">
    <slot />
  </view>
</template>

<script>
export default {
  onLaunch() {
    console.log('App Launch');
  }
};
</script>

<style>
page {
  background: #eef3ff;
  color: #2d3a58;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
}

.app-container {
  min-height: 100vh;
}
</style>
