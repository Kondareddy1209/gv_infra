# Premium Experience Module

This directory contains Phase 4 premium experience features for God's Eye View, including mobile optimization, WebXR support, shareable URLs, analytics, gamification, and notifications.

## Modules

### 1. mobile-optimizer.js

Mobile-first experience optimization with responsive design and touch gestures.

**Key Features:**
- Responsive camera defaults (wider FOV, auto-zoom)
- Touch gesture support (pinch-zoom, two-finger rotate, swipe-pan)
- Gyroscope-based camera tilt
- Accelerometer-based movement
- Mobile HUD adaptation (larger buttons, cleaner layout)
- Bottom sheet for plot details with swipe-to-close
- Full-screen immersive mode toggle
- Portrait/landscape orientation detection

**Usage:**

```javascript
const mobileOptimizer = new MobileOptimizer(cesiumViewer, config);
await mobileOptimizer.initialize();

// Listen for events
window.addEventListener('mobile:orientation-changed', (e) => {
  console.log('Device orientation:', e.detail.device);
});
```

**Configuration:**

```json
{
  "mobile": {
    "enabled": true,
    "breakpoint": 768,
    "gestures": {
      "pinchZoomEnabled": true,
      "twoFingerRotateEnabled": true
    },
    "gyroscope": {
      "enabled": true,
      "requiredPermission": true
    }
  }
}
```

**Events Emitted:**
- `mobile:initialized` - Mobile optimizer ready
- `mobile:orientation-changed` - Device orientation/tilt changed
- `mobile:fullscreen-toggled` - Fullscreen mode toggled

### 2. webxr-immersive.js

WebXR session management for AR/VR immersive experiences.

**Key Features:**
- AR mode: Place plots in real-world space (ARCore/ARKit)
- VR mode: Fully immersive 3D walkthrough with head tracking
- Hand tracking for gesture-based selection
- Voice command integration
- Passthrough video overlay in AR
- Performance optimization for mobile VR (60fps target)
- XR-specific HUD with spatial UI

**Usage:**

```javascript
const xrManager = new WebXRImmersive(cesiumViewer, config);
await xrManager.initialize();

// Check support
if (xrManager.arSupported) {
  await xrManager.startARSession();
}

if (xrManager.vrSupported) {
  await xrManager.startVRSession();
}

// Listen for events
window.addEventListener('xr:session-started', (e) => {
  console.log('XR session started:', e.detail.mode); // 'ar' or 'vr'
});
```

**Device Compatibility:**
- **AR:** iOS 12.2+, Android 8+ (ARKit/ARCore)
- **VR:** Google Cardboard, Samsung Gear VR, Meta Quest (3/3S/Pro)
- **Hand Tracking:** Quest 2+, some Android devices
- **Voice Commands:** Chrome, Firefox, Safari (with permissions)

**Events Emitted:**
- `xr:initialized` - XR system ready
- `xr:session-started` - AR or VR session started
- `xr:session-ended` - XR session ended
- `ar:plot-placed` - Plot placed in AR
- `vr:next-plot` / `vr:prev-plot` - VR navigation

### 3. shareable-urls.js

URL generation and sharing with encoded camera state.

**Key Features:**
- Generate short URLs with encoded camera position/rotation
- Encode viewport state (selected plots, measurements, atmosphere)
- URL obfuscation with base64 encoding
- QR code generation for sharing
- Deep link support for mobile apps
- Expiring share links (configurable)
- Analytics tracking (clicks, device type, referrer)
- View-only mode (disable interactions)
- Password protection for sensitive shares

**Usage:**

```javascript
const shareManager = new ShareableURLs(config);

// Generate share link
const shareLink = await shareManager.generateShareURL(cameraState, {
  expiresIn: 7,
  viewOnly: false,
  password: null,
  selectedPlots: ['plot-1', 'plot-2']
});

console.log('Share URL:', shareLink.shortURL);

// Open QR code dialog
await shareManager.openQRCodeDialog(shareLink);

// Load shared view
shareManager.loadSharedView(cesiumViewer, shareId);

// Get analytics
const analytics = shareManager.getShareAnalytics(shareId);
console.log('Views:', analytics.viewCount);
console.log('Devices:', analytics.deviceBreakdown);
```

**Events Emitted:**
- `share:created` - Share link generated
- `share:link-loaded` - Shared view loaded

### 4. visitor-analytics.js

Session tracking and analytics collection with GDPR compliance.

**Key Features:**
- Session tracking (start, duration, end)
- User interaction logging
- Heatmap of most-viewed plots
- Device/browser tracking
- Engagement metrics
- Error tracking
- Performance metrics (FPS, memory, latency)
- Anonymous session IDs
- Event batching and periodic upload
- Offline support with queue

**Usage:**

```javascript
const analytics = new VisitorAnalytics(config);
await analytics.initialize();

// Track custom event
analytics.trackEvent('plot:viewed', {
  plotId: '123',
  duration: 45000
});

// Get engagement metrics
const metrics = analytics.getEngagementMetrics();
console.log('Session duration:', metrics.sessionDuration);
console.log('Interaction count:', metrics.interactionCount);

// Get heatmap
const heatmap = analytics.getViewHeatmap();
console.log('Most viewed plots:', heatmap);

// Disable analytics (privacy)
analytics.disableAnalytics();

// Check privacy settings
analytics.enableAnalytics();
```

**Privacy:**
- Respects `navigator.doNotTrack`
- GDPR-compliant with consent checking
- Offline event queuing
- Anonymous session IDs (no PII)
- Data retention limits

**Events Emitted:**
- `analytics:initialized` - Analytics system ready
- `analytics:event` - Analytics event tracked

### 5. gamification.js

Achievement badges, points, challenges, and leaderboards.

**Key Features:**
- Achievement badges with progress tracking
- Points system for user interactions
- Tier-based rewards (bronze/silver/gold/platinum)
- Challenge scenarios with objectives
- Leaderboard for agent performance
- Progress bar for property discovery
- Achievement notifications with animations
- Exportable achievement cards
- Agent-specific stats

**Usage:**

```javascript
const gamification = new Gamification(config);
await gamification.initialize();

// Track interaction (automatic via event listeners)
gamification.earnPoints('view-plot');

// Manually unlock achievement
gamification.unlockAchievement('plot-explorer');

// Complete challenge
gamification.completeChallenge('find-best-value');

// Get user profile
const profile = gamification.getUserProfile();
console.log('Level:', profile.level);
console.log('Tier:', profile.tier);
console.log('Achievements:', profile.achievements);

// Show dialogs
gamification.showAchievementsDialog();
gamification.showLeaderboardDialog();
gamification.showChallengesDialog();

// Export achievement card
const cardImage = gamification.exportAchievementCard('plot-explorer');
// cardImage is a data URL ready for sharing
```

**Achievements:**
- Plot Explorer (view 5 plots) - 🗺️
- Master Viewer (view 20 plots) - 👁️
- Tour Enthusiast (watch 3 tours) - 🎬
- Favorite Lover (add 5 favorites) - ❤️
- 360° Veteran (complete 360 tour) - 🔄
- Measurement Master (5 measurements) - 📐
- VR Pioneer (experience VR) - 🥽
- AR Adventurer (try AR) - 📱

**Events Emitted:**
- `gamification:initialized` - Gamification system ready
- `gamification:achievement-unlocked` - Achievement unlocked
- `gamification:points-earned` - Points earned
- `gamification:tier-changed` - User tier changed

### 6. notification-system.js

In-app toast and push notifications with preferences.

**Key Features:**
- In-app toast notifications
- Push notifications (with service worker)
- Notification preferences UI
- Notification history with persistence
- Smart retry logic for failed notifications
- Badge updates (unread count)
- Scheduled notifications
- Support for multiple notification types

**Usage:**

```javascript
const notifications = new NotificationSystem(config);
await notifications.initialize();

// Show toast
notifications.showToast('Plot available!', 'success', {
  duration: 3000,
  action: {
    text: 'View',
    callback: () => console.log('Viewed')
  }
});

// Show notification
await notifications.showNotification({
  type: 'plot',
  title: 'New Listing',
  message: 'A new 2BHK plot is available',
  action: {
    text: 'Details',
    callback: () => {}
  }
});

// Schedule notification
notifications.scheduleNotification({
  type: 'tour',
  title: 'Tour Reminder',
  message: 'Your tour starts in 15 minutes',
  scheduledTime: new Date(Date.now() + 15 * 60000)
});

// Get history
const history = notifications.getHistory({ limit: 10 });

// Show preferences
notifications.showPreferencesDialog();

// Update preferences
notifications.updatePreferences({
  enablePush: true,
  pushFrequency: 'realtime'
});
```

**Toast Types:**
- `success` - ✓
- `error` - ✕
- `warning` - ⚠
- `info` - ℹ
- `plot` - 🏘️
- `price` - 💰
- `tour` - 🎬

**Events Emitted:**
- `notification:system-initialized` - System ready
- `notification:sent` - Notification sent
- `notification:added` - Added to history

## Integration with Phases 1-3

All Phase 4 modules integrate seamlessly with existing functionality:

**Phase 1 (3D Viewer):**
- Mobile optimizer adapts camera for touch devices
- Analytics tracks 3D view interactions
- Notifications alert on plot updates

**Phase 2 (Photography/Virtual Tours):**
- Share links can embed selected photos
- Analytics tracks tour completions
- Gamification rewards tour watching

**Phase 3 (Spatial AI):**
- Analytics tracks AI interactions
- Notifications display AI responses
- Gamification tracks challenge progress

## Mobile Testing Guide

### Setup

1. **Local Development:**
   ```bash
   # Start local server with HTTPS (required for gyroscope/camera access)
   npm run serve:https
   ```

2. **Device Testing:**
   - Connect mobile device to same network
   - Access via `https://<your-ip>:3000`
   - Grant necessary permissions (camera, gyroscope, location)

### Test Cases

**Mobile Optimizer:**
- [ ] Test on iOS and Android
- [ ] Test portrait and landscape modes
- [ ] Test touch gestures (pinch, rotate, swipe)
- [ ] Test gyroscope camera control
- [ ] Test bottom sheet swipe-to-close
- [ ] Test fullscreen mode

**WebXR:**
- [ ] Test AR on ARCore/ARKit devices
- [ ] Test VR with Cardboard viewer
- [ ] Test hand tracking (if device supports)
- [ ] Test voice commands
- [ ] Test fallback to 2D view

**Analytics:**
- [ ] Check offline queue works
- [ ] Verify online sync on reconnect
- [ ] Test do-not-track respect
- [ ] Check privacy consent flow

**Gamification:**
- [ ] Unlock achievements
- [ ] Check progress persistence
- [ ] Test tier updates
- [ ] Export achievement cards

**Notifications:**
- [ ] Test toast notifications
- [ ] Request push permission
- [ ] Test notification history
- [ ] Test preferences persistence

## Performance Optimization

### Mobile Optimization
- Reduce texture quality on low-end devices
- Optimize touch event handling (debounce/throttle)
- Use passive event listeners where possible
- Lazy-load feature modules

### VR Performance
- Target 60 FPS minimum
- Reduce shadow quality
- Lower polygon count for VR
- Use occlusion culling

### Analytics
- Batch events before sending
- Implement exponential backoff for retries
- Compress event payloads
- Limit offline queue size

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Mobile Optimizer | ✓ | ✓ | ✓ | ✓ |
| WebXR AR | ✓ | ✓ | ✓ (iOS 15+) | ✓ |
| WebXR VR | ✓ | ✓ | ✗ | ✓ |
| Voice Commands | ✓ | ✓ | ✗ | ✓ |
| Service Worker | ✓ | ✓ | ✓ | ✓ |
| Web Notifications | ✓ | ✓ | ✓ | ✓ |

## Configuration

All modules load configuration from `config/premium-experience.json`. See the configuration file for detailed options.

## Troubleshooting

### Mobile Optimizer
- **Gestures not working:** Check if touch events are being prevented
- **Gyroscope not responding:** Verify HTTPS, check permissions
- **Bottom sheet sticking:** Check for z-index conflicts

### WebXR
- **AR/VR buttons not showing:** Check if WebXR is supported
- **Session fails to start:** Check device capabilities, permissions
- **Low FPS in VR:** Reduce scene complexity, enable optimization

### Analytics
- **Events not syncing:** Check network, verify endpoint
- **Privacy consent blocking:** Check localStorage for privacy settings
- **Memory usage high:** Reduce batch size, limit history

### Gamification
- **Achievements not unlocking:** Check progress calculations
- **Leaderboard not updating:** Verify backend endpoint
- **Points not saving:** Check localStorage permissions

### Notifications
- **Push not working:** Check service worker registration
- **Toasts not showing:** Verify notification container exists
- **Preferences not persisting:** Check localStorage access

## API Reference

### Mobile Optimizer
- `initialize()` - Initialize system
- `getStatus()` - Get current status
- `toggleFullscreen()` - Toggle fullscreen mode
- `zoomToEntity(entity)` - Zoom to entity

### WebXR
- `initialize()` - Check XR support
- `startARSession()` - Start AR
- `startVRSession()` - Start VR
- `endSession()` - End XR session
- `getStatus()` - Get XR status

### Shareable URLs
- `generateShareURL(cameraState, options)` - Create share link
- `loadSharedView(viewer, shareId)` - Load shared view
- `generateQRCode(url)` - Generate QR code
- `openQRCodeDialog(shareLink)` - Show QR dialog
- `verifyShareAccess(shareId, password)` - Verify access
- `getShareAnalytics(shareId)` - Get analytics

### Analytics
- `initialize()` - Initialize tracking
- `trackEvent(category, data)` - Track event
- `trackInteraction(action, data)` - Track interaction
- `getEngagementMetrics()` - Get metrics
- `getViewHeatmap()` - Get heatmap
- `disableAnalytics()` - Opt-out

### Gamification
- `initialize()` - Initialize system
- `earnPoints(action)` - Add points
- `unlockAchievement(badgeId)` - Unlock badge
- `completeChallenge(challengeId)` - Complete challenge
- `getUserProfile()` - Get user profile

### Notifications
- `initialize()` - Initialize system
- `showToast(message, type, options)` - Show toast
- `showNotification(config)` - Show notification
- `scheduleNotification(config)` - Schedule notification
- `showPreferencesDialog()` - Show preferences
- `getHistory(options)` - Get notification history

## Future Enhancements

- [ ] Offline-first architecture with service workers
- [ ] Advanced hand gesture recognition
- [ ] 3D avatar presence for shared tours
- [ ] Social features (comments, live reactions)
- [ ] Advanced AR furniture placement
- [ ] Multi-player VR tours
- [ ] Agent-specific analytics dashboard
- [ ] Dynamic difficulty challenges
- [ ] Blockchain-based achievements
- [ ] AI-powered recommendations

---

For detailed implementation guides, see `docs/PHASE_4_PREMIUM_EXPERIENCE.md`.
