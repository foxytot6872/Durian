# 🔧 Fix Git Push Connection Issue

The error `127.0.0.1 refused to connect` is likely caused by GitHub authentication trying to use OAuth with a localhost callback that's being blocked.

## ✅ Solution: Use Personal Access Token (PAT)

### Step 1: Create a Personal Access Token on GitHub

1. Go to GitHub.com and sign in
2. Click your profile picture (top right) → **Settings**
3. Scroll down to **Developer settings** (left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name: `Durian Project Token`
7. Select expiration: **90 days** (or longer)
8. Check these permissions:
   - ✅ **repo** (Full control of private repositories)
     - ✅ repo:status
     - ✅ repo_deployment
     - ✅ public_repo
   - ✅ **workflow** (Update GitHub Action workflows)
9. Click **Generate token** (at bottom)
10. **⚠️ IMPORTANT:** Copy the token immediately (you won't see it again!)

### Step 2: Use the Token to Push

**Option A: Use token in the URL (one-time)**

When you push, git will ask for username and password:
- **Username:** Your GitHub username (foxytot6872)
- **Password:** Paste the Personal Access Token (NOT your GitHub password)

```bash
git push origin main
```

**Option B: Store the token in Git credential manager**

```bash
# Set credential helper (Windows)
git config --global credential.helper manager-core

# Or use the manager
git config --global credential.helper manager
```

Then when you push, it will prompt for credentials:
- Username: `foxytot6872`
- Password: `<paste your PAT token here>`

Git will save it for future pushes.

**Option C: Store token in URL (less secure, but simple)**

```bash
# Update remote to include username
git remote set-url origin https://foxytot6872@github.com/foxytot6872/Durian.git

# When pushing, it will ask for password (use the PAT token)
git push origin main
```

### Step 3: Test the Push

```bash
# Add your changes first
git add .gitignore .firebaserc .github/workflows/deploy.yml firebase.json QUICK_DEPLOY_SETUP.md

# Commit
git commit -m "Setup automatic Firebase deployment"

# Push (will prompt for credentials - use PAT as password)
git push origin main
```

## 🔄 Alternative: Switch to SSH (More Secure)

If you prefer SSH instead of HTTPS:

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter to accept default location
# Enter passphrase (optional but recommended)
```

### Step 2: Add SSH Key to GitHub

1. Copy your public key:
   ```bash
   type %USERPROFILE%\.ssh\id_ed25519.pub
   ```
   (Copy the entire output)

2. Go to GitHub → Settings → **SSH and GPG keys** → **New SSH key**
3. Paste the key and save

### Step 3: Change Remote to SSH

```bash
git remote set-url origin git@github.com:foxytot6872/Durian.git
git push origin main
```

## 🐛 Troubleshooting

**Still getting 127.0.0.1 error?**
- Check Windows Firewall settings
- Check antivirus software (might block localhost connections)
- Try using SSH instead (see above)

**Token not working?**
- Make sure you copied the entire token
- Verify token hasn't expired
- Check token has `repo` permission enabled

**Can't push still?**
```bash
# Check what git is trying to do
git push origin main --verbose

# Or check remote URL
git remote -v
```

---

**Recommended:** Use **Personal Access Token (PAT)** with credential helper - it's the most reliable for automated deployments and team collaboration.

