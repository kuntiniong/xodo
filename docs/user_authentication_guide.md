# User Authentication Guide

This guide explains how to use the authentication features in Xodo, including signing in, data synchronization, and managing your account.

## Getting Started

### Anonymous Usage
When you first visit Xodo, you're automatically in "Anonymous" mode:
- You can immediately start creating and managing todo items
- All your data is stored locally on your device
- No account required to use basic features

### Why Sign In?

Signing in with Google provides these benefits:
- **Data Sync**: Your todos are backed up to the cloud
- **Multi-device Access**: Access your todos from any device
- **Data Security**: Your data is safely stored in Google's cloud infrastructure
- **Account Recovery**: Never lose your todos if you clear browser data

## How to Sign In

1. **Locate the Profile Area**: Look for your profile in the top-right corner of the navigation bar
   - Shows "Anonymous" when not signed in
   - Displays a default profile icon

2. **Open the User Menu**: Click on the profile area to open the dropdown menu

3. **Sign In**: Click "Sign in with Google" button

4. **Google OAuth**: You'll be redirected to Google's sign-in page
   - Enter your Google account credentials
   - Grant permission for Xodo to access your basic profile information

5. **Automatic Data Sync**: After successful sign-in:
   - Your existing local todos are automatically uploaded to the cloud
   - Your profile name and picture appear in the navbar
   - Real-time sync is enabled

## User Interface Changes After Sign-In

### Navigation Bar
- **Profile Picture**: Your Google profile picture replaces the default icon
- **Display Name**: Your Google account name appears instead of "Anonymous"
- **Dropdown Menu**: Shows your profile information and sign-out option

### Data Synchronization
- **Automatic Backup**: Every change you make is automatically saved to the cloud
- **Real-time Updates**: Changes sync across all your signed-in devices instantly
- **Offline Support**: You can still use the app offline; changes sync when you're back online

## Managing Your Account

### Viewing Profile Information
Click on your profile in the navbar to see:
- Your profile picture
- Your display name
- Your email address
- Sign-out option

### Signing Out

1. Click on your profile area in the navbar
2. Click "Sign out" in the dropdown menu
3. You'll be signed out immediately
4. Your local data remains on the device
5. The interface returns to "Anonymous" mode

**Important**: Signing out doesn't delete your cloud data. Your todos remain safely stored and will be available when you sign in again.

## Data Synchronization Behavior

### First Sign-In
When you sign in for the first time:
1. All your existing local todos are uploaded to the cloud
2. A user profile is created in the database
3. Real-time sync is activated

### Subsequent Sign-Ins
When you sign in on a new device or after signing out:
1. Your cloud data is downloaded to the local device
2. Any existing local data is merged with cloud data
3. Cloud data takes priority in case of conflicts

### Real-Time Sync
While signed in:
- **Immediate Local Updates**: Changes appear instantly in your interface
- **Background Cloud Sync**: Changes are saved to the cloud within seconds
- **Cross-Device Sync**: Changes appear on your other devices in real-time
- **Conflict Resolution**: If you make changes on multiple devices simultaneously, the last change wins

## Privacy and Security

### What Data We Store
- **Profile Information**: Name, email, and profile picture from your Google account
- **Todo Items**: Your todo list items and their completion status
- **Timestamps**: When items were created and last modified

### What We Don't Store
- Your Google password (handled by Google OAuth)
- Any other personal information beyond what's needed for the app
- Your browsing history or other app usage data

### Data Protection
- **Encrypted in Transit**: All data is encrypted when traveling between your device and our servers
- **Secure Storage**: Data is stored in Google's secure cloud infrastructure
- **Access Control**: Only you can access your data when properly authenticated
- **No Third-Party Sharing**: Your data is never shared with third parties

## Troubleshooting

### Sign-In Issues

**"Sign-in popup was blocked"**
- Enable popups for the Xodo website in your browser settings
- Try signing in again

**"Authentication failed"**
- Check your internet connection
- Try refreshing the page and signing in again
- Ensure you're using a valid Google account

**"Unable to access Google account"**
- Make sure you have a Google account
- Check if your Google account is active and not suspended
- Try signing in to Google directly to verify your account works

### Sync Issues

**"Changes not appearing on other devices"**
- Check your internet connection on both devices
- Make sure you're signed in to the same Google account on both devices
- Try refreshing the page or app

**"Lost data after signing in"**
- Don't worry! Your local data is uploaded to the cloud during first sign-in
- If you don't see your todos, try signing out and back in
- Contact support if data is still missing

**"App seems slow after signing in"**
- This is normal during initial sync, especially with lots of todos
- Performance returns to normal after initial synchronization completes

### Browser Compatibility

**Supported Browsers:**
- Chrome (recommended)
- Firefox
- Safari
- Edge

**If you experience issues:**
- Update your browser to the latest version
- Clear browser cache and cookies for the site
- Try using an incognito/private browsing window

## Best Practices

### For Optimal Experience
1. **Stay Signed In**: Keep yourself signed in for automatic sync and backup
2. **Regular Backups**: Your data is automatically backed up, but consider exporting important lists periodically
3. **Single Account**: Use the same Google account across all your devices
4. **Good Internet**: Ensure stable internet connection for real-time sync

### For Data Safety
1. **Don't Clear Browser Data**: If you must clear browser data, make sure you're signed in so your data is in the cloud
2. **Use Strong Google Password**: Protect your Google account with a strong password and 2FA
3. **Sign Out on Shared Devices**: Always sign out when using shared or public computers

## Getting Help

If you encounter any issues with authentication or data sync:

1. **Check This Guide**: Review the troubleshooting section above
2. **Try Basic Steps**: Refresh the page, check internet connection, try signing out and back in
3. **Browser Console**: Advanced users can check the browser console (F12) for error messages
4. **Contact Support**: If issues persist, contact our support team with:
   - Description of the problem
   - Browser and version you're using
   - Steps you've already tried
   - Any error messages you've seen

Remember: Your data safety is our priority. Authentication is designed to enhance your experience while keeping your information secure.
