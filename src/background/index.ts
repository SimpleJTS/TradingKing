import { handleMessage, type BackgroundRequest } from './message-router';

chrome.runtime.onInstalled.addListener(() => {
  console.info('[TradingKing] background service worker installed');
});

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  void handleMessage(request as BackgroundRequest).then(sendResponse);
  return true;
});
