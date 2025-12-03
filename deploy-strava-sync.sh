#!/bin/bash

# Deploy Strava Auto-Sync Function
# This script helps deploy the strava-auto-sync Edge Function

set -e

echo "🚀 Strava Auto-Sync Deployment Script"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if user is logged in
echo "Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please run: supabase login"
    echo ""
    read -p "Would you like to login now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase login
    else
        echo "Please login first, then run this script again."
        exit 1
    fi
fi

echo "✅ Logged in to Supabase"
echo ""

# Get project reference
echo "Please enter your Supabase project reference ID:"
echo "(You can find this in your Supabase dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF)"
read -p "Project Reference: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo ""
echo "📦 Deploying strava-auto-sync function..."
supabase functions deploy strava-auto-sync --project-ref "$PROJECT_REF"

echo ""
echo "✅ Function deployed successfully!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Set function secrets:"
echo "   supabase secrets set STRAVA_CLIENT_ID=your_client_id --project-ref $PROJECT_REF"
echo "   supabase secrets set STRAVA_CLIENT_SECRET=your_client_secret --project-ref $PROJECT_REF"
echo "   supabase secrets set CRON_SECRET=\$(openssl rand -hex 32) --project-ref $PROJECT_REF"
echo ""
echo "2. Set up cron job (choose one):"
echo "   - Option A: Use pg_cron (Pro/Team plans) - See DEPLOY_STRAVA_SYNC.md"
echo "   - Option B: Use GitHub Actions (Free tier) - Copy .github/workflows/strava-sync.yml.example"
echo ""
echo "For detailed instructions, see DEPLOY_STRAVA_SYNC.md"

