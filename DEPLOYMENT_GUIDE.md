# Website Deployment Guide

## 🎯 Recommended: Firebase Hosting

**Why Firebase Hosting?**
- ✅ Already using Firebase (Auth + Realtime Database)
- ✅ Free tier with generous limits
- ✅ HTTPS by default
- ✅ Global CDN for fast loading
- ✅ Easy deployment with Firebase CLI
- ✅ Custom domain support
- ✅ Automatic SSL certificates
- ✅ Perfect for static sites (HTML/CSS/JS)

## 📋 Prerequisites

1. **Node.js** installed (for Firebase CLI)
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **Firebase account** (you already have this)
   - Same account used for Firebase project: `testing-151e6`

3. **Firebase CLI** installed
   ```bash
   npm install -g firebase-tools
   ```

## 🚀 Deployment Steps

### Step 1: Initialize Firebase Hosting

**In your project root directory** (where `index.html` is):

```bash
# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting
```

**When prompted:**
- **Select existing project:** Choose `testing-151e6`
- **Public directory:** `./` (current directory)
- **Single-page app:** `No` (you have multiple HTML pages)
- **Set up automatic builds:** `No` (unless using CI/CD)
- **Overwrite index.html:** `No` (keep your existing file)

### Step 2: Configure Firebase Hosting

**Create/update `firebase.json`** (should be auto-generated):

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "Iot Code (DO NOT TOUCH)/**",
      "*.md",
      "PROJECT_REPORT.md",
      "SYSTEM_ARCHITECTURE.md",
      "FIREBASE_RTDB_ARCHITECTURE.md",
      "FIREBASE_RULES_UPDATE.md",
      "CAMERA_FEED_GUIDE.md"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### Step 3: Deploy

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

**Your site will be live at:**
- `https://testing-151e6.web.app`
- `https://testing-151e6.firebaseapp.com`

### Step 4: Custom Domain (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `testing-151e6`
3. Go to **Hosting** → **Add custom domain**
4. Enter your domain (e.g., `durian-farm.com`)
5. Follow DNS setup instructions
6. Firebase automatically provisions SSL certificate

## 🔄 Updating the Website

**After making changes:**

```bash
# Deploy updates
firebase deploy --only hosting
```

**Or deploy everything (hosting + functions if you add them later):**
```bash
firebase deploy
```

## 📁 Files Included/Excluded

**✅ Included (deployed):**
- All HTML files (`index.html`, `login.html`, `Map.html`, etc.)
- All CSS files (`css/*.css`)
- All JavaScript files (`js/*.js`)
- Assets (`assets/*`)
- `firebase-config.js` (contains your Firebase config)

**❌ Excluded (not deployed):**
- `Iot Code (DO NOT TOUCH)/` (Raspberry Pi and ESP32 code)
- Documentation files (`*.md`)
- `firebase.json` (deployment config)
- `.git/` (version control)
- `node_modules/` (if any)

## 🎨 Alternative Deployment Options

### Option 2: Netlify

**Pros:**
- Free tier
- Drag-and-drop deployment
- Git integration
- HTTPS by default

**Steps:**
1. Go to [netlify.com](https://www.netlify.com/)
2. Sign up/login
3. Drag your project folder (excluding `Iot Code (DO NOT TOUCH)/`) to Netlify
4. Done! Site is live

### Option 3: Vercel

**Pros:**
- Free tier
- Git integration
- Excellent performance
- HTTPS by default

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` in project root
3. Follow prompts

### Option 4: GitHub Pages

**Pros:**
- Free
- Simple if using GitHub

**Cons:**
- Limited features
- No server-side redirects

**Steps:**
1. Push code to GitHub
2. Go to repository → Settings → Pages
3. Select branch and folder
4. Site live at: `https://username.github.io/repo-name`

## 🔒 Security Notes

1. **Firebase Config:** Your `firebase-config.js` contains API keys, but these are **safe to expose** in client-side code. Firebase security rules protect your data.

2. **Environment Variables:** If you need to hide sensitive data, use Firebase Functions (backend) or Firebase Remote Config.

3. **HTTPS:** All recommended hosting options provide HTTPS by default.

## 📊 Performance Tips

1. **Enable Compression:** Firebase Hosting automatically compresses files
2. **Cache Static Assets:** Already configured in `firebase.json`
3. **Optimize Images:** Compress images in `assets/` folder
4. **Minify JS/CSS:** Use build tools if needed (optional)

## 🐛 Troubleshooting

### "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### "Permission denied"
```bash
firebase login
```

### "Deployment failed"
- Check `firebase.json` syntax
- Ensure you're in the project root
- Check Firebase Console for errors

### "Site not updating"
- Clear browser cache
- Wait a few minutes for CDN propagation
- Check Firebase Console → Hosting for deployment status

## 📝 Quick Reference

```bash
# Login
firebase login

# Initialize (first time only)
firebase init hosting

# Deploy
firebase deploy --only hosting

# View deployments
firebase hosting:channel:list

# Rollback (if needed)
firebase hosting:clone SOURCE_SITE_ID:CHANNEL_ID TARGET_SITE_ID:live
```

## ✅ Deployment Checklist

- [ ] Node.js installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Initialized hosting (`firebase init hosting`)
- [ ] `firebase.json` configured correctly
- [ ] Tested locally (optional: `firebase serve`)
- [ ] Deployed (`firebase deploy --only hosting`)
- [ ] Verified site is live
- [ ] Tested authentication
- [ ] Tested Firebase Realtime Database connection
- [ ] Tested camera feeds (if applicable)
- [ ] Custom domain configured (optional)

---

**Recommended:** Use **Firebase Hosting** since you're already using Firebase services. It's the simplest and most integrated solution for your project.

