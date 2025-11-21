# 🌐 Domain Registration Guide

## Quick Answer: Where to Get a Domain

### Free Domain Options (Best for Testing/Learning)

1. **Freenom** - Free `.tk`, `.ml`, `.ga`, `.cf` domains
   - Website: https://www.freenom.com
   - Best for: Testing, personal projects
   - **Limitations:** Some features limited, may have ads

2. **No-IP** - Free dynamic DNS subdomain
   - Website: https://www.noip.com
   - Best for: Dynamic IP addresses
   - **Example:** `yourname.ddns.net`

3. **DuckDNS** - Free dynamic DNS
   - Website: https://www.duckdns.org
   - Best for: Simple, reliable dynamic DNS
   - **Example:** `yourname.duckdns.org`

4. **Cloudflare Registrar** - Cheap domains ($8-10/year)
   - Website: https://www.cloudflare.com/products/registrar
   - Best for: When you want a real domain (.com, .net, etc.)
   - **Benefits:** Includes DNS management, DDoS protection

---

## Recommended: Paid Domain Options (Production Use)

### Best Overall Value

1. **Namecheap** - $8-15/year for .com domains
   - Website: https://www.namecheap.com
   - **Why:** Good support, easy to use, includes free SSL via Let's Encrypt integration
   - **Popular:** `.com`, `.net`, `.org` domains

2. **Google Domains** (Now Squarespace Domains) - $12/year
   - Website: https://domains.squarespace.com
   - **Why:** Simple interface, Google integration
   - **Note:** Recently acquired by Squarespace

3. **Cloudflare Registrar** - At-cost pricing (~$8-10/year)
   - Website: https://www.cloudflare.com/products/registrar
   - **Why:** No markup, transparent pricing, great DNS service
   - **Best for:** Technical users

4. **Porkbun** - $4-10/year for first year
   - Website: https://porkbun.com
   - **Why:** Low prices, free SSL, easy management

---

## Step-by-Step: Getting a Domain for Your VPS

### Option 1: Free Domain from Freenom (Quick & Free)

**Step 1: Register at Freenom**
1. Go to https://www.freenom.com
2. Click "Get Started Now" → Sign up
3. Verify your email

**Step 2: Search for Domain**
1. Enter your desired name (e.g., `duriancam`, `durianfarm`)
2. Click "Get it now!"
3. Select a free TLD: `.tk`, `.ml`, `.ga`, `.cf`, or `.gq`
4. Select "12 Months @ FREE" (or 3 months)
5. Click "Checkout"

**Step 3: Complete Checkout**
1. Set period to 12 months
2. Check "I have read and agree to the Terms & Conditions"
3. Click "Complete Order"
4. Wait for domain to be registered (usually instant)

**Step 4: Configure DNS**
1. In Freenom dashboard, go to "Services" → "My Domains"
2. Click "Manage Domain"
3. Click "Management Tools" → "Nameservers"
4. **Option A:** Use custom nameservers (if you're using Cloudflare)
5. **Option B:** Use Freenom nameservers and add A record:
   - Type: `A`
   - Name: `@` (or leave blank)
   - TTL: `3600`
   - Target: `161.118.209.162` (your VPS IP)

**Step 5: Wait for DNS Propagation**
- Wait 5-30 minutes for DNS to propagate
- Test: `ping yourdomain.tk` (should show your VPS IP)

**Step 6: Set Up SSL with Let's Encrypt**
```bash
# SSH into your VPS
ssh hlsuploader@161.118.209.162

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.tk

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (Yes - recommended)
```

**Done!** Your domain will have HTTPS working.

---

### Option 2: Paid Domain from Namecheap (Recommended for Production)

**Step 1: Register Domain**
1. Go to https://www.namecheap.com
2. Search for your desired domain (e.g., `durian-farm.com`)
3. Add to cart → Checkout
4. Create account and complete payment ($8-15/year)

**Step 2: Configure DNS**
1. Go to "Domain List" → Select your domain → "Manage"
2. Go to "Advanced DNS" tab
3. Add A record:
   - Type: `A Record`
   - Host: `@`
   - Value: `161.118.209.162`
   - TTL: `Automatic` or `300` seconds
4. Click "Save All Changes"

**Step 3: Wait for DNS**
- Wait 5-60 minutes for DNS propagation
- Check: `ping yourdomain.com`

**Step 4: Set Up SSL**
```bash
# SSH into VPS
ssh hlsuploader@161.118.209.162

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Follow prompts (same as above)
```

---

### Option 3: Free Subdomain from DuckDNS (Simplest)

**Step 1: Create Account**
1. Go to https://www.duckdns.org
2. Sign in with Google/GitHub/etc.
3. Choose a subdomain name (e.g., `duriancam`)
4. Your domain will be: `duriancam.duckdns.org`

**Step 2: Configure DNS**
1. In DuckDNS dashboard, set IP to: `161.118.209.162`
2. Click "Update IP"
3. DNS updates instantly

**Step 3: Set Up SSL**
```bash
# SSH into VPS
ssh hlsuploader@161.118.209.162

# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d duriancam.duckdns.org
```

**Note:** DuckDNS domains work great with Let's Encrypt!

---

## Which Option Should You Choose?

### For Testing/Development:
✅ **Freenom** (free `.tk`, `.ml` domains) or **DuckDNS** (free subdomain)

### For Production/Public Use:
✅ **Namecheap** or **Cloudflare Registrar** (paid `.com` domain)

---

## Quick Comparison Table

| Provider | Cost | Type | Best For |
|----------|------|------|----------|
| **Freenom** | Free | `.tk`, `.ml`, `.ga` | Testing |
| **DuckDNS** | Free | `.duckdns.org` | Quick setup |
| **No-IP** | Free | `.ddns.net` | Dynamic IPs |
| **Namecheap** | $8-15/year | `.com`, `.net`, etc. | Production |
| **Cloudflare** | $8-10/year | `.com`, `.net`, etc. | Best value |
| **Porkbun** | $4-10/year | Various | Budget option |

---

## What to Do After Getting Domain

1. ✅ Point DNS to your VPS IP (`161.118.209.162`)
2. ✅ Wait for DNS propagation (5-60 minutes)
3. ✅ Test: `ping yourdomain.com` or `nslookup yourdomain.com`
4. ✅ Set up SSL certificate (see `HTTPS_SETUP_GUIDE.md`)
5. ✅ Update camera feed URLs in Firebase to use `https://yourdomain.com/hls/cam1.m3u8`

---

## Troubleshooting

**"Domain not resolving"**
- Wait longer (DNS can take up to 48 hours, usually 5-60 minutes)
- Check DNS records: `nslookup yourdomain.com`
- Verify A record points to `161.118.209.162`

**"SSL certificate failed"**
- Make sure DNS is pointing to your VPS
- Check firewall allows port 80 and 443
- Verify domain is accessible: `curl http://yourdomain.com`

**"Domain expired"**
- Free domains (Freenom) need renewal every 3-12 months
- Check your domain registrar for renewal options

---

## Recommended: Start with Free, Upgrade Later

**Quick Start Path:**
1. Get free domain from **DuckDNS** (`yourname.duckdns.org`) - takes 2 minutes
2. Set up SSL certificate - takes 5 minutes
3. Test everything works
4. Later, upgrade to paid `.com` domain if needed

This gets you HTTPS working immediately without spending money!

---

**Next Steps:**
1. Choose a provider above
2. Get your domain
3. Point DNS to `161.118.209.162`
4. Follow `HTTPS_SETUP_GUIDE.md` to set up SSL
5. Update your camera feed URLs to use HTTPS

