# GitHub Push Guide

This guide explains how to push the Incident Response Agent to GitHub.

## 📋 Prerequisites

1. **GitHub Account**: You need a GitHub account at https://github.com
2. **Git Authentication**: Set up either:
   - Personal Access Token (recommended)
   - SSH key
   - GitHub CLI

## 🚀 Step-by-Step Instructions

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Enter repository name: **incident-response-agent**
3. Set description: "AI-powered incident response agent that learns from historical incidents"
4. Choose visibility: **Public** (or Private if preferred)
5. Click "Create repository"

### Step 2: Push with Personal Access Token (Recommended)

#### On Windows PowerShell:

```powershell
cd "c:\Users\HET SHAH\OneDrive\Desktop\hackbaroda\incident-response-agent"

# If remote is already set, verify it
git remote -v

# If not set, add the remote
git remote add origin https://github.com/pmshahmehta-lgtm/incident-response-agent.git

# Push to GitHub (will prompt for credentials)
git push -u origin main
```

When prompted for credentials:
- **Username**: Your GitHub username (e.g., pmshahmehta-lgtm)
- **Password**: Use your **Personal Access Token** (not your GitHub password!)

#### To Create a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "incident-response-agent"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. Copy the token (you'll only see it once!)
7. Use this token as the password when pushing

### Step 3: Verify Push Success

```powershell
# Check remote status
git remote -v

# Verify push
git log --oneline -n 5
```

Expected output:
```
2e65c80 Add production screenshots and comprehensive README documentation
3d1a41e Production-ready Incident Response Agent with complete debugging fixes and hardening
```

### Step 4: Verify on GitHub

1. Go to https://github.com/pmshahmehta-lgtm/incident-response-agent
2. You should see:
   - ✅ All files uploaded
   - ✅ README.md with screenshots
   - ✅ Commit history
   - ✅ 2 commits

## 🔐 Alternative: Using SSH Key

If you prefer SSH (more secure):

```powershell
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "pmshahmehta@gmail.com"

# Add SSH key to GitHub
# 1. Go to https://github.com/settings/ssh/new
# 2. Paste your public key (from ~/.ssh/id_ed25519.pub)

# Update remote to SSH
git remote set-url origin git@github.com:pmshahmehta-lgtm/incident-response-agent.git

# Push
git push -u origin main
```

## 🐛 Troubleshooting

### Error: "Repository not found"
- ✅ Check repository URL is correct
- ✅ Verify repository exists on GitHub
- ✅ Confirm your credentials/token is valid

### Error: "fatal: The current branch main has no upstream branch"
Solution:
```powershell
git push -u origin main
```

### Error: "Permission denied (publickey)"
- ✅ Check SSH key is added to GitHub account
- ✅ Verify SSH key permissions: `chmod 600 ~/.ssh/id_ed25519`
- ✅ Test connection: `ssh -T git@github.com`

### Error: "fatal: could not read Username"
- ✅ You're likely using HTTPS without a personal access token
- ✅ Generate a token at https://github.com/settings/tokens
- ✅ Use token as password

## 📊 After Pushing Successfully

Your GitHub repository will show:

### Repository Status
- **License**: Apache 2.0
- **Language**: Python, JavaScript, HTML/CSS
- **Files**: 27 files
- **Size**: ~500 KB
- **Commits**: 2 commits

### Project Structure Visible
```
incident-response-agent/
├── backend/
├── api/
├── frontend/
├── agents/
├── screenshots/  ← Shows your 4 application screenshots
├── README.md     ← Comprehensive documentation with images
└── [other files]
```

### README Display
GitHub will automatically display your README.md with:
- ✅ Production status badge
- ✅ Screenshots displayed inline
- ✅ Quick start instructions
- ✅ API documentation
- ✅ Architecture diagrams

## 🎯 What's Included in Push

### Code Files (27 files)
- Backend: orchestrator.py, knowledge_manager.py, server.py
- Frontend: index.html, script.js, style.css
- Configuration: settings.py, requirements.txt
- Documentation: README.md, LICENSE, GETTING_STARTED.md

### Screenshots (4 files)
- `01-main-page.png` - System status and navigation
- `02-investigation-form.png` - Incident submission form
- `03-investigation-results.png` - Root cause analysis and remediation
- `04-knowledge-base.png` - Historical incidents and solutions

### Documentation
- README.md (5000+ characters) - Complete guide
- GETTING_STARTED.md - Setup instructions
- USER_GUIDE.md - Usage guide
- PROJECT_SUMMARY.md - Technical overview

## ✅ Verification Checklist

After successful push, verify on GitHub:

- [ ] Repository exists at https://github.com/pmshahmehta-lgtm/incident-response-agent
- [ ] 27 files visible in repository
- [ ] README.md displays with formatting
- [ ] 4 screenshots are visible in README
- [ ] Commit history shows 2 commits
- [ ] License displayed as Apache 2.0
- [ ] All folders visible (backend, api, frontend, etc.)

## 🔄 Future Updates

To make updates and push:

```powershell
# Make changes to files
# ... edit code ...

# Stage changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## 📞 Support

If you need help:
1. Check GitHub status at https://www.githubstatus.com
2. Verify your credentials at https://github.com/settings/personal-access-tokens
3. Check Git documentation: https://git-scm.com/doc
4. Test connection: `git ls-remote origin`

---

**Ready to push?** Follow Step 1 & Step 2 above! 🚀
